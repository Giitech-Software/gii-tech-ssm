import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  FileText,
  User,
  CalendarDays,
  ClipboardList,
  Loader2,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Layers,
  Clock,
  Award,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import type { Submission } from "../../services/submissionService";

// 🔹 Small reusable stat card
const StatCard = ({ icon, title, value, gradient }: any) => (
  <div
    className={`bg-gradient-to-br ${gradient} text-white rounded-2xl shadow-md p-6 flex flex-col justify-between`}
  >
    <div className="flex items-center gap-3">
      {icon}
      <h3 className="text-lg font-semibold">{title}</h3>
    </div>
    <p className="text-3xl font-bold mt-3">{value}</p>
  </div>
);

interface Assignment {
  id: string;
  title: string;
  className?: string;
  type?: "short-answer" | "objective" | "essay";
  questions?: { question: string; answer: string; options?: string[] }[];
  teacherId?: string;
}

const TeacherViewSubmissionsPage: React.FC = () => {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [selectedAssignmentData, setSelectedAssignmentData] =
    useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingGrading: 0,
    averageScore: 0,
  });

  // Grade modal state
  const [showGradeModal, setShowGradeModal] = useState(false);
  const [currentSubmission, setCurrentSubmission] = useState<Submission | null>(
    null
  );
  const [feedback, setFeedback] = useState("");
  const [scoreInput, setScoreInput] = useState<number | null>(null);
  const [savingGrade, setSavingGrade] = useState(false);

  // Answers modal state
  const [showAnswersModal, setShowAnswersModal] = useState(false);
  const [answersSubmission, setAnswersSubmission] = useState<Submission | null>(
    null
  );

  const openAnswersModal = (submission: Submission) => {
    setAnswersSubmission(submission);
    setShowAnswersModal(true);
  };

  // ===========================
  // Load Assignments
  // ===========================
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        if (!user?.uid) return;
        const q = query(
          collection(db, "assignments"),
          where("teacherId", "==", user.uid),
          orderBy("createdAt", "desc")
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        })) as Assignment[];
        setAssignments(data);
      } catch (error) {
        console.error("Error loading assignments:", error);
        toast.error("Failed to load assignments");
      }
    };
    fetchAssignments();
  }, [user]);

  // ===========================
  // Load Submissions (All + Filter)
  // ===========================
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        let qRef;
        if (!selectedAssignment) {
          // Load ALL submissions (most recent first)
          qRef = query(collection(db, "submissions"), orderBy("submittedAt", "desc"));
          // Clear selected assignment data in UI
          setSelectedAssignmentData(null);
        } else {
          // Load only submissions for selected assignment
          qRef = query(
            collection(db, "submissions"),
            where("assignmentId", "==", selectedAssignment),
            orderBy("submittedAt", "desc")
          );
        }

        const snap = await getDocs(qRef);
        let data = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as Submission[];

        // If assignment selected → load assignment data & auto-grade if appropriate
        if (selectedAssignment) {
          const aRef = doc(db, "assignments", selectedAssignment);
          const aSnap = await getDoc(aRef);
          const aData = aSnap.exists() ? (aSnap.data() as Assignment) : null;
          setSelectedAssignmentData(aData);

          if (aData?.type !== "essay" && aData?.questions?.length) {
            data = data.map((sub) => {
              // Don't overwrite stored score
if (typeof sub.score === "number") return sub;

// STOP if questions do not exist
if (!aData?.questions || aData.questions.length === 0) {
  sub.score = 0;
  sub.grade = "0%";
  return sub;
}

let score = 0;

aData.questions.forEach((q, i) => {
  const given =
    sub.answers?.[i]?.trim()?.toLowerCase() ||
    sub.responses?.[i]?.selected?.trim()?.toLowerCase();

  const correct = q.answer?.trim()?.toLowerCase();

  if (given && correct && given === correct) score++;
});

const percent = Math.round((score / aData.questions.length) * 100);

sub.score = percent;
sub.grade = `${percent}%`;

return sub;

            });
          }
        }

        setSubmissions(data);

        // Stats
        const total = data.length;
        const graded = data.filter((s) => typeof s.score === "number").length;
        const pending = total - graded;
        const avg =
          graded > 0
            ? Math.round(data.reduce((a, s) => a + (typeof s.score === "number" ? s.score : 0), 0) / graded)
            : 0;

        setStats({
          totalSubmissions: total,
          pendingGrading: pending,
          averageScore: avg,
        });
      } catch (e) {
        console.error(e);
        toast.error("Error loading submissions");
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [selectedAssignment]);

  // ===========================
  // Recalculate Scores
  // ===========================
  const handleRecalculate = async () => {
    if (!selectedAssignmentData) return;
    setMarking(true);
    try {
      const updated = submissions.map((sub) => {
        if (
          selectedAssignmentData.type !== "essay" &&
          selectedAssignmentData.questions?.length
        ) {
          let score = 0;
          selectedAssignmentData.questions!.forEach((q, i) => {
            const given = sub.answers?.[i]?.trim()?.toLowerCase() || sub.responses?.[i]?.selected?.trim()?.toLowerCase();
            const correct = q.answer?.trim()?.toLowerCase();
            if (given && correct && given === correct) score++;
          });
          sub.score = Math.round(
            (score / selectedAssignmentData.questions!.length) * 100
          );
          sub.grade = `${sub.score}%`;
        }
        return sub;
      });
      setSubmissions(updated);
      toast.success("Auto-marking recalculated successfully!");
    } catch (err) {
      console.error(err);
      toast.error("Error recalculating marks");
    } finally {
      setMarking(false);
    }
  };

  // ===========================
  // Grade Modal Functions
  // ===========================
  const openGradeModal = (submission: Submission) => {
    setCurrentSubmission(submission);
    setFeedback(submission.feedback || "");
    setScoreInput(submission.score ?? null);
    setShowGradeModal(true);
  };

  const saveGrade = async () => {
    if (!currentSubmission) return;
    setSavingGrade(true);

    try {
      const submissionId = currentSubmission.id;
      if (!submissionId) throw new Error("Submission ID is missing");

      const ref = doc(db, "submissions", submissionId);
      await updateDoc(ref, {
        feedback,
        score: scoreInput ?? null,
        grade: scoreInput !== null ? `${scoreInput}%` : null,
      });

      setSubmissions((prev) =>
        prev.map((sub) =>
          sub.id === submissionId
            ? {
                ...sub,
                feedback,
                score: scoreInput ?? undefined,
                grade: typeof scoreInput === "number" ? `${scoreInput}%` : undefined,
              }
            : sub
        )
      );

      toast.success("Grade saved!");
      setShowGradeModal(false);
    } catch (err) {
      console.error(err);
      toast.error("Failed to save grade");
    } finally {
      setSavingGrade(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
          <ClipboardList className="text-indigo-600" /> Student Submissions
        </h1>
        <p className="text-gray-600 mt-2">
          View all submissions — automatically marked for short-answer and objective tests.
        </p>
      </div>

      {/* Assignment Filter */}
      <div className="bg-white shadow rounded-2xl p-6 mb-6 border border-gray-100">
        <label className="block text-gray-700 font-semibold mb-2">Select Assignment:</label>
        <select
          value={selectedAssignment}
          onChange={(e) => setSelectedAssignment(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-full"
        >
          <option value="">-- All Submissions --</option>
          {assignments.map((a) => (
            <option key={a.id} value={a.id}>
              {a.title} {a.className && `(${a.className})`}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard icon={<Layers size={28} />} title="Total Submissions" value={stats.totalSubmissions} gradient="from-indigo-500 to-indigo-600" />
        <StatCard icon={<Clock size={28} />} title="Pending Grading" value={stats.pendingGrading} gradient="from-yellow-500 to-orange-500" />
        <StatCard icon={<Award size={28} />} title="Average Score" value={stats.averageScore ? `${stats.averageScore}%` : "—"} gradient="from-green-500 to-emerald-600" />
      </div>

      {/* Submissions Table */}
      <div className="bg-white rounded-2xl shadow border border-gray-100">
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-gray-800">
            <FileText className="text-blue-500" /> Submissions List
          </h2>

          {selectedAssignmentData &&
            selectedAssignmentData.type !== "essay" &&
            submissions.length > 0 && (
              <button
                onClick={handleRecalculate}
                disabled={marking}
                type="button"
                className="flex items-center gap-2 bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                <RefreshCw size={16} className={marking ? "animate-spin" : ""} />
                {marking ? "Recalculating..." : "Recalculate Scores"}
              </button>
            )}
        </div>

        {loading ? (
          <div className="p-6 flex justify-center items-center text-gray-500 gap-2">
            <Loader2 className="animate-spin" /> Loading submissions...
          </div>
        ) : submissions.length === 0 ? (
          <div className="p-6 text-center text-gray-500">No submissions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-gray-700">
              <thead className="bg-gray-100 text-gray-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Student</th>
                  <th className="px-4 py-3">Submitted At</th>
                  <th className="px-4 py-3">File</th>
                  <th className="px-4 py-3">Score / Grade</th>
                  <th className="px-4 py-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {submissions.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b hover:bg-gray-50 transition duration-150"
                  >
                    {/* STUDENT */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="text-gray-500" size={16} />
                        <span>{s.studentName || s.studentId}</span>
                      </div>
                    </td>

                    {/* SUBMITTED AT */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 text-gray-600">
                        <CalendarDays size={14} />
                        <span>
                          {s.submittedAt
                            ? new Date(
                                s.submittedAt?.seconds
                                  ? s.submittedAt.seconds * 1000
                                  : s.submittedAt
                              ).toLocaleString()
                            : "—"}
                        </span>
                      </div>
                    </td>

                    {/* FILE */}
                    <td className="px-4 py-3">
                      {s.submissionUrl ? (
                        <a
                          href={s.submissionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          View File
                        </a>
                      ) : (
                        "—"
                      )}
                    </td>

                    {/* SCORE / GRADE */}
                    <td className="px-4 py-3">
                      {typeof s.score === "number" ? (
                        <span className="text-green-600 flex items-center gap-1 font-semibold">
                          <CheckCircle2 size={14} /> {s.score}%
                        </span>
                      ) : s.grade ? (
                        <span className="text-green-600">{s.grade}</span>
                      ) : (
                        <span className="text-gray-400 flex items-center gap-1">
                          <XCircle size={14} /> Not graded
                        </span>
                      )}
                    </td>

                    {/* ACTIONS */}
                    <td className="px-4 py-3 text-gray-700 align-top">
                      <div className="flex flex-col gap-2">
                        <span className="text-sm text-gray-600">{s.feedback || "—"}</span>

                        <div className="flex flex-col space-y-1">

  {/* View Answers for short answers */}
  {s.answers && Array.isArray(s.answers) && (
    <button
      onClick={() => openAnswersModal(s)}
      className="flex items-center gap-1 text-purple-600 hover:underline text-xs"
    >
      <ClipboardList size={12} /> View Answers
    </button>
  )}

  {/* View Answers for MCQs */}
  {s.responses && Array.isArray(s.responses) && (
    <button
      onClick={() => openAnswersModal(s)}
      className="flex items-center gap-1 text-purple-600 hover:underline text-xs"
    >
      <ClipboardList size={12} /> View Answers
    </button>
  )}

  {/* ✅ View Answers for Essays */}
  {s.responseText && (
    <button
      onClick={() => openAnswersModal(s)}
      className="flex items-center gap-1 text-purple-600 hover:underline text-xs"
    >
      <ClipboardList size={12} /> View Answers
    </button>
  )}

  {/* Grade/Edit */}
  <button
    onClick={() => openGradeModal(s)}
    className="text-indigo-600 hover:underline text-xs"
  >
    Grade / Edit
  </button>
</div>

                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------- ANSWERS MODAL ---------- */}
      {showAnswersModal && answersSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 relative">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <ClipboardList className="text-purple-600" />
              Student Answers
            </h2>

            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
             {/* Short-answer answers */}
{answersSubmission.answers &&
  answersSubmission.answers.map((ans: string, idx: number) => (
    <div key={`ans-${idx}`} className="border-b pb-2">
      <p className="font-medium text-gray-800">Q{idx + 1}:</p>
      <p className="text-gray-600">{ans || "—"}</p>
    </div>
  ))}

{/* MCQ style responses */}
{answersSubmission.responses &&
  Array.isArray(answersSubmission.responses) &&
  answersSubmission.responses.map((r: any, idx: number) => (
    <div key={`resp-${idx}`} className="border-b pb-2">
      <p className="font-medium text-gray-800">Q{idx + 1}:</p>
      <p className="text-gray-600">
        {r.selected ? `Selected: ${r.selected}` : "—"}
        {r.choiceText ? ` (${r.choiceText})` : ""}
      </p>
    </div>
  ))}

{/* ✅ Essay Response — PLACE IT HERE */}
{answersSubmission.responseText && (
  <div className="border-b pb-2">
    <p className="font-semibold text-gray-800">Essay Response</p>
    <p className="text-gray-600 whitespace-pre-wrap">
      {answersSubmission.responseText}
    </p>
  </div>
)}

              {/* Fallback */}
              {!answersSubmission.answers &&
                !answersSubmission.responses && (
                  <div className="text-gray-600">No answers available.</div>
                )}
            </div>

            <button
              type="button"
              onClick={() => setShowAnswersModal(false)}
              className="mt-5 w-full bg-purple-600 text-white py-2 rounded-md hover:bg-purple-700"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ---------- GRADE MODAL ---------- */}
      {showGradeModal && currentSubmission && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex justify-center items-center z-50">
          <div className="bg-white w-full max-w-md rounded-xl shadow-lg p-6 relative">
            <h2 className="text-xl font-bold mb-4 text-gray-800">Grade Submission</h2>

            <p className="text-gray-700 mb-2">
              <strong>Student:</strong> {currentSubmission.studentName}
            </p>

            <label className="block text-sm mt-4 mb-1 font-medium text-gray-700">Score (%)</label>
            <input
              type="number"
              value={scoreInput ?? ""}
              onChange={(e) => setScoreInput(Number(e.target.value))}
              className="w-full p-2 border rounded-lg"
              min={0}
              max={100}
            />

            <label className="block text-sm mt-4 mb-1 font-medium text-gray-700">Feedback</label>
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="w-full p-2 border rounded-lg h-24"
            />

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={() => setShowGradeModal(false)}
                className="px-4 py-2 bg-gray-300 rounded-lg hover:bg-gray-400"
              >
                Close
              </button>

              <button
                type="button"
                onClick={saveGrade}
                disabled={savingGrade}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingGrade ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherViewSubmissionsPage;
