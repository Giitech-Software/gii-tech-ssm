import { useCallback, useEffect, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../src/contexts/AuthContext";
import { useSync } from "../src/contexts/SyncContext";
import {
  fetchNotifications,
  type WorkflowNotification,
} from "../src/services/communicationService";
import {
  fetchAdminDashboardDetail,
  fetchParentDashboardDetail,
  fetchStudentDashboardDetail,
  fetchTeacherDashboardDetail,
  type AdminDashboardDetail,
  type DashboardItem,
  type ParentDashboardDetail,
  type RecentActivityItem,
  type StudentDashboardDetail,
  type TeacherDashboardDetail,
} from "../src/services/mobileDashboardService";

const studentTools = [
  ["Assignments", "Review coursework and deadlines.", "./student/assignments"],
  ["Submissions", "Open coursework and update submitted responses.", "./student/submissions"],
  ["Grades", "Check marks and teacher feedback.", "./student/grades"],
  ["Attendance", "Review your daily attendance.", "./student/attendance"],
] as const;

const parentTools = [
  ["Performance", "Review linked-student marks.", "./parent/performance"],
  ["Attendance", "Check daily attendance records.", "./parent/attendance"],
  ["Notifications", "Open family alerts and school updates.", "./parent/notifications"],
  ["Reports", "Open released term reports.", "./parent/reports"],
  ["Messages", "Continue school conversations.", "./parent/messages"],
  ["Fees", "Review balances and payments.", "./parent/fees"],
] as const;

const teacherTools = [
  ["Assignments", "Create and manage class coursework.", "./teacher/assignments"],
  ["Attendance", "Record the daily class register.", "./teacher/attendance"],
  ["Submissions", "Review student work and record feedback.", "./teacher/submissions"],
  ["Grades", "Review recorded assignment and exam outcomes.", "./teacher/grades"],
  ["Grade summary", "Compare student, class, and subject performance.", "./teacher/grade-summary"],
  ["Exam grades", "Record subject marks for configured exams.", "./teacher/exam-grades"],
  ["Feedback", "Open submissions that need teacher comments.", "./teacher/feedback"],
  ["Messages", "Continue school conversations.", "./teacher/messages"],
] as const;

const adminTools = [
  ["Students", "Maintain enrollment profiles and placement.", "./admin/students"],
  ["Staff", "Maintain teaching staff profiles.", "./admin/staff"],
  ["Departments", "Define major school divisions.", "./admin/departments"],
  ["Classes", "Create class placement options.", "./admin/classes"],
  ["Streams", "Manage class streams.", "./admin/streams"],
  ["Activity logs", "Review administrative audit history.", "./admin/activity"],
  ["Communications", "Publish school notices and maintain the academic calendar.", "./admin/communications"],
  ["Promotions", "Move students into their next placement.", "./admin/promotions"],
  ["Assessment setup", "Configure terms and class exam windows.", "./admin/assessments"],
  ["Report publishing", "Release reviewed term report snapshots.", "./admin/report-publishing"],
  ["Family links", "Connect parent and student profiles.", "./admin/family-links"],
  ["Fee structures", "Define class-based school fees.", "./admin/fees"],
  ["Finance ledger", "Track student charges and payments.", "./admin/finance"],
  ["Reports", "Compare school indicators and open detailed student records.", "./admin/analytics"],
  ["Student QR identity", "Generate student lookup identity cards.", "./admin/student-qr"],
] as const;

const superAdminTools = [
  ["User management", "Review login identities and access roles.", "./superadmin/accounts"],
  ["Create user", "Provision a new school account.", "./superadmin/accounts"],
] as const;

const sharedTools = [
  ["Announcements", "Read notices and important school updates.", "./shared/announcements"],
  ["Academic calendar", "Review term dates, exams, and activities.", "./shared/calendar"],
  ["Notifications", "Open active alerts for your account.", "./shared/notifications"],
  ["Messages", "Continue secure school conversations.", "./shared/messages"],
] as const;

type DashboardCard = readonly [string, string | number, string];
type DashboardQueue = readonly [string, string | number, string, string];

function money(value: number) {
  return `GHS ${value.toFixed(2)}`;
}

function NotificationPreview({
  notifications,
  onOpen,
}: {
  notifications: WorkflowNotification[];
  onOpen: (route: string) => void;
}) {
  return (
    <View className="mt-6">
      <View className="flex-row items-center justify-between">
        <View className="mr-3 flex-1">
          <Text className="text-lg font-extrabold text-slate-900">Notifications</Text>
          <Text className="mt-1 text-sm text-slate-500">Active workflow alerts and school notices.</Text>
        </View>
        <Pressable
          className="rounded-2xl bg-white px-4 py-3 active:bg-slate-50"
          onPress={() => onOpen("/shared/notifications")}
        >
          <Text className="text-sm font-bold text-slate-700">Open</Text>
        </Pressable>
      </View>
      <View className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {notifications.slice(0, 4).map((notification, index) => (
          <Pressable
            className={`p-5 active:bg-slate-50 ${index ? "border-t border-slate-100" : ""}`}
            key={notification.id}
            onPress={() => onOpen(notification.route || "/shared/notifications")}
          >
            <Text className="text-sm font-extrabold text-slate-900">{notification.title}</Text>
            <Text className="mt-1 text-xs leading-5 text-slate-500" numberOfLines={2}>
              {notification.message}
            </Text>
          </Pressable>
        ))}
        {!notifications.length && (
          <Text className="p-5 text-sm text-slate-500">No active notifications.</Text>
        )}
      </View>
    </View>
  );
}

function DashboardCards({ cards }: { cards: DashboardCard[] }) {
  return (
    <View className="mt-4 flex-row flex-wrap justify-between">
      {cards.map(([label, value, detail]) => (
        <View
          className="mb-3 w-[48%] rounded-3xl border border-slate-200 bg-white p-4"
          key={label}
        >
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </Text>
          <Text className="mt-3 text-2xl font-black text-slate-900">{value}</Text>
          <Text className="mt-1 text-xs leading-4 text-slate-500">{detail}</Text>
        </View>
      ))}
    </View>
  );
}

function ActionQueue({
  items,
  onOpen,
}: {
  items: DashboardQueue[];
  onOpen: (route: string) => void;
}) {
  return (
    <View className="mt-6">
      <Text className="text-lg font-extrabold text-slate-900">Action queue</Text>
      <Text className="mt-1 text-sm text-slate-500">The next work items that deserve attention.</Text>
      <View className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {items.map(([label, value, detail, route], index) => (
          <Pressable
            className={`p-5 active:bg-slate-50 ${index ? "border-t border-slate-100" : ""}`}
            key={label}
            onPress={() => onOpen(route)}
          >
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-sm font-extrabold text-slate-900">{label}</Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">{detail}</Text>
              </View>
              <Text className="text-base font-black text-slate-900">{value}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RecentList({
  title,
  subtitle,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: RecentActivityItem[];
  emptyText: string;
}) {
  return (
    <View className="mt-6">
      <Text className="text-lg font-extrabold text-slate-900">{title}</Text>
      <Text className="mt-1 text-sm text-slate-500">{subtitle}</Text>
      <View className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {items.map((item, index) => (
          <View className={`p-5 ${index ? "border-t border-slate-100" : ""}`} key={item.id}>
            <Text className="text-sm font-extrabold text-slate-900">{item.title}</Text>
            <Text className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</Text>
          </View>
        ))}
        {!items.length && <Text className="p-5 text-sm text-slate-500">{emptyText}</Text>}
      </View>
    </View>
  );
}

function itemToQueue(item: DashboardItem): DashboardQueue {
  return [item.label, item.value, item.detail, item.route];
}

export default function Index() {
  const router = useRouter();
  const { user, role, displayName, loading, login, logout } = useAuth();
  const { status, pendingCount, lastSyncedAt, syncNow } = useSync();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [studentSummary, setStudentSummary] = useState<StudentDashboardDetail | null>(null);
  const [parentSummary, setParentSummary] = useState<ParentDashboardDetail | null>(null);
  const [teacherSummary, setTeacherSummary] = useState<TeacherDashboardDetail | null>(null);
  const [adminSummary, setAdminSummary] = useState<AdminDashboardDetail | null>(null);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [summaryError, setSummaryError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  const openRoute = useCallback(
    (route: string) => {
      router.push(route as never);
    },
    [router]
  );

  const loadStudentSummary = useCallback(async () => {
    if (!user || role !== "student") return;

    setSummaryLoading(true);
    setSummaryError("");
    try {
      setStudentSummary(await fetchStudentDashboardDetail(user.uid));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Unable to load your student dashboard."
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadStudentSummary();
  }, [loadStudentSummary]);

  const loadParentData = useCallback(async () => {
    if (!user || role !== "parent") return;

    setSummaryLoading(true);
    setSummaryError("");
    try {
      setParentSummary(await fetchParentDashboardDetail(user.uid));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Unable to load your family dashboard."
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadParentData();
  }, [loadParentData]);

  const loadTeacherSummary = useCallback(async () => {
    if (!user || role !== "teacher") return;

    setSummaryLoading(true);
    setSummaryError("");
    try {
      setTeacherSummary(await fetchTeacherDashboardDetail(user.uid));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Unable to load your teacher dashboard."
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadTeacherSummary();
  }, [loadTeacherSummary]);

  const loadAdminSummary = useCallback(async () => {
    if (!user || (role !== "admin" && role !== "superadmin")) return;

    setSummaryLoading(true);
    setSummaryError("");
    try {
      setAdminSummary(await fetchAdminDashboardDetail(user.uid));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Unable to load the administration dashboard."
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadAdminSummary();
  }, [loadAdminSummary]);

  const loadNotifications = useCallback(async () => {
    if (!user || !role) return;
    try {
      const result = await fetchNotifications(user.uid, role);
      setNotifications(result.data);
    } catch {
      setNotifications([]);
    }
  }, [role, user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleLogin = async () => {
    if (!id.trim() || !password) {
      setError("Enter your school ID and password.");
      return;
    }

    setSubmitting(true);
    setError("");
    try {
      await login(id, password);
    } catch {
      setError("Sign-in failed. Check your school ID and password.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="mt-4 text-base text-slate-300">Loading Giitech-SSM...</Text>
      </View>
    );
  }

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-slate-950">
        <ScrollView
          contentContainerClassName="flex-grow justify-center px-6 py-10"
          keyboardShouldPersistTaps="handled"
        >
          <View className="mb-8">
            <Text className="text-sm font-bold uppercase tracking-widest text-sky-400">
              Giitech Smart School Manager
            </Text>
            <Text className="mt-4 text-4xl font-black leading-tight text-white">
              Your school, connected.
            </Text>
            <Text className="mt-3 text-base leading-6 text-slate-300">
              Sign in with the school ID issued by your administrator.
            </Text>
          </View>

          <View className="rounded-3xl bg-white p-6">
            <Text className="text-2xl font-extrabold text-slate-900">Welcome back</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-500">
              Use the same school credentials as the Giitech-SSM web portal.
            </Text>

            <Text className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
              School ID
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
              onChangeText={setId}
              placeholder="e.g. STU-0001"
              placeholderTextColor="#94a3b8"
              value={id}
            />

            <Text className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
              Password
            </Text>
            <TextInput
              className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-slate-900"
              onChangeText={setPassword}
              onSubmitEditing={handleLogin}
              placeholder="Enter your password"
              placeholderTextColor="#94a3b8"
              secureTextEntry
              value={password}
            />

            {!!error && <Text className="mt-4 text-sm font-semibold text-red-600">{error}</Text>}

            <Pressable
              className="mt-6 items-center rounded-2xl bg-sky-600 px-4 py-4 active:bg-sky-700"
              disabled={submitting}
              onPress={handleLogin}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">Sign in</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <ScrollView contentContainerClassName="px-5 py-6">
        <View className="rounded-3xl bg-slate-950 p-6">
          <Text className="text-xs font-bold uppercase tracking-widest text-sky-400">
            Giitech-SSM
          </Text>
          <Text className="mt-4 text-3xl font-black text-white">
            Hello, {displayName || "school member"}
          </Text>
          <Text className="mt-2 text-base capitalize text-slate-300">
            {role || "Profile pending"} dashboard
          </Text>
        </View>

        <Text className="mt-8 text-lg font-extrabold text-slate-900">Your school workspace</Text>
        <Text className="mt-2 text-base leading-6 text-slate-600">
          Open the same operational workflows as the web portal, with offline queues for mobile work.
        </Text>

        {role === "student" && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-slate-900">Student overview</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Your academic snapshot
                </Text>
              </View>
              <Pressable
                className="rounded-2xl bg-sky-100 px-4 py-3 active:bg-sky-200"
                disabled={summaryLoading}
                onPress={loadStudentSummary}
              >
                <Text className="text-sm font-bold text-sky-800">
                  {summaryLoading ? "Loading..." : "Refresh"}
                </Text>
              </Pressable>
            </View>

            {!!summaryError && (
              <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {summaryError}
              </Text>
            )}

            {!!studentSummary && (
              <>
                {studentSummary.source === "cache" && (
                  <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Showing your saved offline snapshot.
                  </Text>
                )}
                <DashboardCards
                  cards={[
                    ["Assignments due", studentSummary.assignmentsDue, `${studentSummary.activeAssignments} active assignments`],
                    ["Submissions", studentSummary.submissions, "Coursework submitted"],
                    ["Grades", studentSummary.grades, "Recorded results"],
                    ["Attendance", `${studentSummary.attendanceRate}%`, `${studentSummary.attendanceRecords} attendance records`],
                  ]}
                />
                <ActionQueue
                  items={[
                    ...(studentSummary.nextWork.length
                      ? studentSummary.nextWork.map(itemToQueue)
                      : [["Assignments still to submit", studentSummary.assignmentsDue, "Review active coursework and deadlines.", "./student/assignments"] as DashboardQueue]),
                    ["Attendance record", `${studentSummary.attendanceRate}%`, "Review your daily attendance history.", "./student/attendance"],
                    ["Recorded grades", studentSummary.grades, "Check marks and teacher feedback.", "./student/grades"],
                  ]}
                  onOpen={openRoute}
                />
                <RecentList
                  emptyText="No recent grades have been recorded yet."
                  items={studentSummary.recentGrades}
                  subtitle="Latest marks and feedback from your teachers."
                  title="Recent grades"
                />
                <RecentList
                  emptyText="No attendance records have been captured yet."
                  items={studentSummary.attendanceTrend}
                  subtitle="Recent daily attendance entries."
                  title="Attendance trend"
                />
                <NotificationPreview notifications={notifications} onOpen={openRoute} />
                <Text className="mt-6 text-lg font-extrabold text-slate-900">Student tools</Text>
                {studentTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                    key={route}
                    onPress={() => router.push(route)}
                  >
                    <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {role === "parent" && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-slate-900">Family overview</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {parentSummary?.students || 0} linked student profiles
                </Text>
              </View>
              <Pressable
                className="rounded-2xl bg-indigo-100 px-4 py-3 active:bg-indigo-200"
                disabled={summaryLoading}
                onPress={loadParentData}
              >
                <Text className="text-sm font-bold text-indigo-800">
                  {summaryLoading ? "Loading..." : "Refresh"}
                </Text>
              </Pressable>
            </View>
            {!!summaryError && (
              <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {summaryError}
              </Text>
            )}
            {!!parentSummary && (
              <>
                {parentSummary.source === "cache" && (
                  <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Showing your saved offline family snapshot.
                  </Text>
                )}
                <DashboardCards
                  cards={[
                    ["Students", parentSummary.students, "Family profiles connected"],
                    ["Attendance", `${parentSummary.attendanceRate}%`, "Linked-student attendance"],
                    ["Reports", parentSummary.reports, "Published academic reports"],
                    ["Outstanding", money(parentSummary.outstandingBalance), "Open fee balances"],
                  ]}
                />
                <ActionQueue
                  items={[
                    ...(parentSummary.balances.length
                      ? parentSummary.balances.map(itemToQueue)
                      : [["Outstanding fee balance", money(parentSummary.outstandingBalance), "Review charges, payments, and receipts.", "./parent/fees"] as DashboardQueue]),
                    ["Workflow notifications", notifications.length, "Review family alerts and school updates.", "/shared/notifications"],
                    ["Published reports", parentSummary.reports, "Open released academic snapshots.", "./parent/reports"],
                  ]}
                  onOpen={openRoute}
                />
                <RecentList
                  emptyText="No recent grades are available yet."
                  items={parentSummary.recentGrades}
                  subtitle="Newest grade entries for linked students."
                  title="Recent grades"
                />
                <RecentList
                  emptyText="No released reports are available yet."
                  items={parentSummary.recentReports}
                  subtitle="Published academic snapshots for your wards."
                  title="Released reports"
                />
                <RecentList
                  emptyText="No recent attendance concerns."
                  items={parentSummary.attendanceConcerns}
                  subtitle="Recent absences across linked students."
                  title="Attendance concerns"
                />
                <NotificationPreview notifications={notifications} onOpen={openRoute} />
                <Text className="mt-3 text-lg font-extrabold text-slate-900">Parent tools</Text>
                {parentTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                    key={route}
                    onPress={() => router.push(route)}
                  >
                    <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {role === "teacher" && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-slate-900">Teacher overview</Text>
                <Text className="mt-1 text-sm text-slate-500">Daily academic workspace</Text>
              </View>
              <Pressable
                className="rounded-2xl bg-emerald-100 px-4 py-3 active:bg-emerald-200"
                disabled={summaryLoading}
                onPress={loadTeacherSummary}
              >
                <Text className="text-sm font-bold text-emerald-800">
                  {summaryLoading ? "Loading..." : "Refresh"}
                </Text>
              </Pressable>
            </View>
            {!!summaryError && (
              <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {summaryError}
              </Text>
            )}
            {!!teacherSummary && (
              <>
                {teacherSummary.source === "cache" && (
                  <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Showing your saved offline teacher snapshot.
                  </Text>
                )}
                <DashboardCards
                  cards={[
                    ["Active assignments", teacherSummary.activeAssignments, `${teacherSummary.assignments} assignments total`],
                    ["Pending grading", teacherSummary.pendingGrading, "Submissions awaiting review"],
                    ["Average mark", `${teacherSummary.averageMark}%`, `${teacherSummary.gradedSubmissions} graded submissions`],
                    ["Active alerts", notifications.length, "Workflow notifications"],
                    ["Classes", teacherSummary.classes, "Teaching registers"],
                  ]}
                />
                <ActionQueue
                  items={teacherSummary.queue.map(itemToQueue)}
                  onOpen={openRoute}
                />
                <RecentList
                  emptyText="No grades have been recorded yet."
                  items={teacherSummary.recentGrades}
                  subtitle="Latest assignment and exam marks."
                  title="Recent grades"
                />
                <NotificationPreview notifications={notifications} onOpen={openRoute} />
                <Text className="mt-3 text-lg font-extrabold text-slate-900">Teacher tools</Text>
                {teacherTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                    key={route}
                    onPress={() => router.push(route)}
                  >
                    <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {(role === "admin" || role === "superadmin") && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-slate-900">Administration overview</Text>
                <Text className="mt-1 text-sm text-slate-500">Operational school directory</Text>
              </View>
              <Pressable
                className="rounded-2xl bg-indigo-100 px-4 py-3 active:bg-indigo-200"
                disabled={summaryLoading}
                onPress={loadAdminSummary}
              >
                <Text className="text-sm font-bold text-indigo-800">
                  {summaryLoading ? "Loading..." : "Refresh"}
                </Text>
              </Pressable>
            </View>
            {!!summaryError && (
              <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {summaryError}
              </Text>
            )}
            {!!adminSummary && (
              <>
                {adminSummary.source === "cache" && (
                  <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Showing your saved offline administration snapshot.
                  </Text>
                )}
                <DashboardCards
                  cards={[
                    ["Active students", adminSummary.activeStudents, `${adminSummary.students} student profiles total`],
                    ["Staff profiles", adminSummary.staff, "Teaching and staff records"],
                    ["Outstanding fees", money(adminSummary.outstandingFees), `${adminSummary.studentsWithBalances} student ledgers`],
                    ["Attendance today", `${adminSummary.attendanceTodayRate}%`, `${adminSummary.attendanceTodayRecords} records today`],
                    ["Pending grading", adminSummary.pendingSubmissions, "Teacher action queue"],
                    ["Released reports", adminSummary.releasedReports, "Published family snapshots"],
                    ["Family link issues", adminSummary.unresolvedStudentLinks, `${adminSummary.unlinkedParents} unlinked parent profiles`],
                    ["Upcoming exams", adminSummary.upcomingExams, `${adminSummary.activeTerms} active terms configured`],
                  ]}
                />
                <ActionQueue
                  items={[
                    ["Family links requiring review", adminSummary.unresolvedStudentLinks + adminSummary.unlinkedParents, "Connect parent and student profiles.", "./admin/family-links"],
                    ["Students with outstanding balances", adminSummary.studentsWithBalances, `${money(adminSummary.outstandingFees)} remains outstanding.`, "./admin/finance"],
                    ["Submissions awaiting grading", adminSummary.pendingSubmissions, "Monitor assessment readiness before reports.", "./admin/assessments"],
                    ["Detailed reports", adminSummary.releasedReports, "Compare school indicators and student records.", "./admin/analytics"],
                  ]}
                  onOpen={openRoute}
                />
                <RecentList
                  emptyText="No activity has been recorded yet."
                  items={adminSummary.recentActivity}
                  subtitle="Latest recorded operational changes."
                  title="Recent activity"
                />
                <NotificationPreview notifications={notifications} onOpen={openRoute} />
                <Text className="mt-3 text-lg font-extrabold text-slate-900">Administration tools</Text>
                {role === "superadmin" && superAdminTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-indigo-200 bg-indigo-50 p-5 active:bg-indigo-100"
                    key={route}
                    onPress={() => router.push(route)}
                  >
                    <Text className="text-base font-extrabold text-indigo-950">{label}</Text>
                    <Text className="mt-1 text-sm text-indigo-700">{detail}</Text>
                  </Pressable>
                ))}
                {adminTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                    key={route}
                    onPress={() => router.push(route)}
                  >
                    <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {!!role && (
          <View className="mt-6">
            <Text className="text-lg font-extrabold text-slate-900">School updates</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Shared notices, events, and account alerts.
            </Text>
            {sharedTools.map(([label, detail, route]) => (
              <Pressable
                className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                key={route}
                onPress={() => router.push(route)}
              >
                <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Signed-in profile
          </Text>
          <Text className="mt-3 text-base font-bold text-slate-900">
            {displayName || user.email}
          </Text>
          <Text className="mt-1 text-sm capitalize text-slate-500">
            {role || "No role assigned"}
          </Text>
        </View>

        <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Offline sync
              </Text>
              <Text
                className={`mt-2 text-base font-bold ${
                  status === "pending" ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {status === "syncing"
                  ? "Syncing..."
                  : status === "pending"
                    ? "Waiting to sync"
                    : "Ready"}
              </Text>
            </View>
            <View className="rounded-2xl bg-slate-100 px-4 py-3">
              <Text className="text-center text-xl font-black text-slate-900">
                {pendingCount}
              </Text>
              <Text className="text-xs font-semibold text-slate-500">pending</Text>
            </View>
          </View>
          <Text className="mt-3 text-sm leading-5 text-slate-500">
            {lastSyncedAt
              ? `Last sync: ${new Date(lastSyncedAt).toLocaleString()}`
              : "Queued changes will be sent when a connection is available."}
          </Text>
          <Pressable
            className="mt-4 items-center rounded-2xl bg-slate-900 px-4 py-3 active:bg-slate-700"
            disabled={status === "syncing"}
            onPress={syncNow}
          >
            <Text className="text-sm font-bold text-white">Sync now</Text>
          </Pressable>
        </View>

        <Pressable
          className="mt-6 items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-4 active:bg-red-100"
          onPress={logout}
        >
          <Text className="text-base font-bold text-red-700">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
