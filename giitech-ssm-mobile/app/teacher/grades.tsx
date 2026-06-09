import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { StudentDataState } from "../../src/components/StudentDataState";
import { TeacherPageShell } from "../../src/components/TeacherPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import {
  fetchTeacherGradeSummary,
  type TeacherGradeRecord,
  type TeacherGradeSummary,
} from "../../src/services/teacherService";

type GroupBy = "student" | "class" | "subject";

function average(values: TeacherGradeRecord[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((total, grade) => total + grade.score, 0) / values.length);
}

function groupGrades(grades: TeacherGradeRecord[], groupBy: GroupBy) {
  const groups = new Map<string, TeacherGradeRecord[]>();

  grades.forEach((grade) => {
    const key =
      groupBy === "student"
        ? grade.studentName
        : groupBy === "class"
          ? grade.className || grade.classId
          : grade.subject;
    const cleanKey = key || "Unassigned";
    groups.set(cleanKey, [...(groups.get(cleanKey) || []), grade]);
  });

  return [...groups.entries()]
    .map(([name, records]) => ({
      name,
      count: records.length,
      average: average(records),
      pending: records.filter((grade) => grade.pending).length,
    }))
    .sort((left, right) => right.average - left.average || left.name.localeCompare(right.name));
}

function formatGradeTitle(grade: TeacherGradeRecord) {
  if (grade.assessmentType === "exam" && grade.examName) return grade.examName;
  return grade.assignmentTitle || grade.subject || "Grade record";
}

export default function TeacherGradesPage() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<TeacherGradeSummary | null>(null);
  const [groupBy, setGroupBy] = useState<GroupBy>("student");
  const [loading, setLoading] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const result = await fetchTeacherGradeSummary(user.uid);
      setSummary(result.data);
      setOffline(result.source === "cache");
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load teacher grades.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const grouped = useMemo(() => groupGrades(summary?.grades || [], groupBy), [groupBy, summary]);
  const recentGrades = useMemo(() => (summary?.grades || []).slice(0, 12), [summary]);

  return (
    <TeacherPageShell
      subtitle="Review assignment and exam marks recorded from your teacher workspace."
      title="Grade summary"
    >
      <StudentDataState error={error} loading={loading} offline={offline} onRefresh={load} />

      {!!summary && (
        <>
          <View className="mt-5 flex-row flex-wrap justify-between">
            {[
              ["Average", `${summary.average}%`],
              ["Students", summary.gradedStudents],
              ["Subjects", summary.subjects],
              ["Records", summary.grades.length],
            ].map(([label, value]) => (
              <View className="mb-3 w-[48%] rounded-3xl border border-slate-200 bg-white p-4" key={label}>
                <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</Text>
                <Text className="mt-3 text-3xl font-black text-slate-900">{value}</Text>
              </View>
            ))}
          </View>

          <Text className="mt-3 text-xs font-bold uppercase tracking-widest text-slate-500">Group by</Text>
          <View className="mt-2 flex-row flex-wrap">
            {(["student", "class", "subject"] as const).map((option) => (
              <Pressable
                className={`mb-2 mr-2 rounded-full px-4 py-3 ${
                  groupBy === option ? "bg-emerald-700" : "bg-white"
                }`}
                key={option}
                onPress={() => setGroupBy(option)}
              >
                <Text className={`text-sm font-bold capitalize ${groupBy === option ? "text-white" : "text-slate-700"}`}>
                  {option}
                </Text>
              </Pressable>
            ))}
          </View>

          {!loading && !summary.grades.length && !error && (
            <Text className="mt-8 text-center text-sm text-slate-500">
              No grades have been recorded yet.
            </Text>
          )}

          {!!grouped.length && (
            <>
              <Text className="mt-4 text-lg font-extrabold text-slate-900">Summary</Text>
              <View className="mt-2">
                {grouped.map((item) => (
                  <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={item.name}>
                    <View className="flex-row items-start justify-between">
                      <View className="mr-3 flex-1">
                        <Text className="text-base font-extrabold text-slate-900">{item.name}</Text>
                        <Text className="mt-1 text-xs font-semibold text-slate-500">
                          {item.count} grade record{item.count === 1 ? "" : "s"}
                        </Text>
                      </View>
                      <Text className="rounded-full bg-emerald-100 px-3 py-2 text-sm font-black text-emerald-800">
                        {item.average}%
                      </Text>
                    </View>
                    {!!item.pending && (
                      <Text className="mt-3 text-xs font-bold uppercase text-amber-700">
                        {item.pending} queued for sync
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}

          {!!recentGrades.length && (
            <>
              <Text className="mt-3 text-lg font-extrabold text-slate-900">Recent grades</Text>
              <View className="mt-2">
                {recentGrades.map((grade) => (
                  <View className="mb-3 rounded-3xl border border-slate-200 bg-white p-5" key={grade.id}>
                    <View className="flex-row items-start justify-between">
                      <View className="mr-3 flex-1">
                        <Text className="text-base font-extrabold text-slate-900">{grade.studentName}</Text>
                        <Text className="mt-1 text-sm font-semibold text-emerald-700">
                          {formatGradeTitle(grade)}
                        </Text>
                      </View>
                      <Text className="text-xl font-black text-slate-900">{grade.score}%</Text>
                    </View>
                    <Text className="mt-3 text-xs text-slate-500">
                      {grade.subject} | {grade.className || grade.classId || "Class"} | {grade.term || "Term"}
                    </Text>
                    {!!grade.feedback && (
                      <Text className="mt-3 rounded-2xl bg-slate-50 p-3 text-sm leading-5 text-slate-600">
                        {grade.feedback}
                      </Text>
                    )}
                    {grade.pending && (
                      <Text className="mt-3 text-xs font-bold uppercase text-amber-700">Queued for sync</Text>
                    )}
                  </View>
                ))}
              </View>
            </>
          )}
        </>
      )}
    </TeacherPageShell>
  );
}
