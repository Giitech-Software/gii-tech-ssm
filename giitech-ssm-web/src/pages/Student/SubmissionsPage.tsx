// src/pages/Students/SubmissionsPage.tsx
import React, { useEffect, useState } from "react";
import { db, storage } from "../../firebaseConfig";
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  setDoc,
  serverTimestamp,
  documentId,
  doc,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { useAuth } from "../../contexts/AuthContext";
import {
  FileText,
  Upload,
  CheckCircle,
  XCircle,
  MessageSquare,
  ClipboardList,
  Hourglass,
} from "lucide-react";
import toast from "react-hot-toast";
import { useSearchParams } from "react-router-dom";
import { runFirestorePermissionDiagnostics } from "../../utils/firestoreDiagnostics";
import { getQueuedQuizSubmissions, getQuizDraft, queueQuizSubmission, removeQueuedQuizSubmission, saveQuizDraft } from "../../services/OfflineQuizService";

runFirestorePermissionDiagnostics();


interface Assignment {
  id: string;
  title: string;
  classId: string;
  type?: "essay" | "file" | "short-answer" | "quiz" | "objective";
  description?: string;
  durationMinutes?: number;
  maxAttempts?: number;
  questions?: { question: string; options?: string[]; answer?: string; questionType?: "multiple-choice" | "true-false" | "fill-blank" }[];
}

interface Submission {
  id?: string;
  assignmentId: string;
  assignmentName?: string;
  studentId: string;
  studentUid?: string;
  studentName?: string;
  classId?: string;
  submissionUrl?: string;
  responseText?: string;
  responses?: { question: string; selected: string; correct: boolean }[];
  score?: number;
  submittedAt?: string | any;
  createdAt?: any;
  status?: string;
  feedback?: string;
  grade?: string;
  attempts?: number;
}

const SubmissionsPage: React.FC = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const assignmentIdFromUrl = searchParams.get("assignmentId");
  const classIdFromUrl = searchParams.get("classId");

  const [studentClass, setStudentClass] = useState<string | null>(null);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignment, setSelectedAssignment] = useState<string>("");
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [essayText, setEssayText] = useState<string>("");
  const [perQuestionResponses, setPerQuestionResponses] = useState<Record<number, string>>({});
  const [perQuestionFeedback, setPerQuestionFeedback] = useState<Record<number, boolean | null>>({});
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);


  const formatSubmittedAt = (val: any) => {
    if (!val) return "—";
    try {
      if (typeof val === "string") return new Date(val).toLocaleString();
      if (val?.toDate && typeof val.toDate === "function") return val.toDate().toLocaleString();
      return new Date(val).toLocaleString();
    } catch {
      return "—";
    }
  };

  /** 🔹 Fetch student info */
  useEffect(() => {
    const fetchStudent = async () => {
      if (!user) return;
      try {
        const studentQ = query(collection(db, "students"), where("userId", "==", user.uid));
        const snap = await getDocs(studentQ);
        if (!snap.empty) {
          const data = snap.docs[0].data() as any;
          setStudentClass(classIdFromUrl || data.classId || null);
          setStudentId(data.studentId || user.uid);
        } else {
          setStudentClass(classIdFromUrl || null);
          setStudentId(user.uid);
        }
      } catch (err) {
        console.error("Error fetching student record:", err);
        setStudentClass(classIdFromUrl || null);
        setStudentId(user?.uid || null);
      }
    };
    fetchStudent();
  }, [user, classIdFromUrl]);

  /** 🔹 Fetch assignments for this class */
  useEffect(() => {
    if (!studentClass) return;
    const fetchAssignments = async () => {
      try {
        const q = query(collection(db, "assignments"), where("classId", "==", studentClass));
        const snap = await getDocs(q);
        const data = snap.docs.map((d) => {
          const raw = d.data() as Assignment;
          // normalize type
          const normalizedType =
            raw.type === "objective" ? "quiz" : raw.type || "file";
          return { ...raw, id: d.id, type: normalizedType };
        });
        setAssignments(data);

        if (assignmentIdFromUrl) {
          const exists = data.find((a) => a.id === assignmentIdFromUrl);
          if (exists) setSelectedAssignment(exists.id);
        }
      } catch (err) {
        console.error("Error fetching assignments:", err);
        toast.error("Failed to load assignments.");
      }
    };
    fetchAssignments();
  }, [studentClass, assignmentIdFromUrl]);

  useEffect(() => {
    if (!selectedAssignment || !studentId) return;
    void getQuizDraft(selectedAssignment, studentId).then((draft) => {
      if (!draft) return;
      setPerQuestionResponses(draft.responses);
      setEssayText(draft.essayText);
    });
  }, [selectedAssignment, studentId]);

  useEffect(() => {
    const synchronizeQueuedSubmissions = async () => {
      if (!navigator.onLine || !user) return;
      const queued = await getQueuedQuizSubmissions();
      for (const item of queued) {
        try {
          await addDoc(collection(db, "submissions"), { ...item.queuedSubmission, status: "submitted", syncedAt: serverTimestamp() });
          await removeQueuedQuizSubmission(item.key);
        } catch (syncError) {
          console.warn("Queued quiz submission remains pending:", syncError);
        }
      }
    };
    void synchronizeQueuedSubmissions();
    window.addEventListener("online", synchronizeQueuedSubmissions);
    return () => window.removeEventListener("online", synchronizeQueuedSubmissions);
  }, [user]);

  /** 🔹 Fetch submissions */
  useEffect(() => {
    if (!user) return;

    const fetchSubmissions = async () => {
      setLoading(true);
      try {
        // Preferred: query by studentUid (auth UID) — this is what rules now check
        const qByUid = query(collection(db, "submissions"), where("studentUid", "==", user.uid));
        const snapByUid = await getDocs(qByUid);

        let submissionData: any[] = [];

        if (!snapByUid.empty) {
          submissionData = snapByUid.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
        } else {
          // Fallback for older entries: find this student's school ID and query by studentId
          const studentQ = query(collection(db, "students"), where("userId", "==", user.uid));
          const studentSnap = await getDocs(studentQ);
          if (!studentSnap.empty) {
            const studentDoc = studentSnap.docs[0].data() as any;
            const schoolStudentId = studentDoc.studentId;
            if (schoolStudentId) {
              const qBySchoolId = query(collection(db, "submissions"), where("studentId", "==", schoolStudentId));
              const snapBySchoolId = await getDocs(qBySchoolId);
              submissionData = snapBySchoolId.docs.map((d) => ({ id: d.id, ...(d.data() as any) }));
            }
          }
        }

        if (submissionData.length === 0) {
          setSubmissions([]);
          setLoading(false);
          return;
        }

        // Resolve assignment titles for each submission (in chunks of 10)
        const assignmentIds = Array.from(new Set(submissionData.map((s) => s.assignmentId).filter(Boolean)));
        const chunks: string[][] = [];
        for (let i = 0; i < assignmentIds.length; i += 10) {
          chunks.push(assignmentIds.slice(i, i + 10));
        }

        const assignmentResults = await Promise.all(
          chunks.map(async (chunk) => {
            const aQuery = query(collection(db, "assignments"), where(documentId(), "in", chunk));
            const aSnap = await getDocs(aQuery);
            return aSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
          })
        );

        const allAssignments = assignmentResults.flat();
        const assignmentMap = Object.fromEntries(allAssignments.map((a: any) => [a.id, a.title || a.name || "—"]));

        const merged = submissionData
          .map((s) => ({ ...s, assignmentName: assignmentMap[s.assignmentId] || s.assignmentId }))
          .sort((a, b) => {
            const ta = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
            const tb = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
            return tb - ta;
          });

        setSubmissions(merged);
      } catch (err) {
        console.error("Error fetching submissions:", err);
        toast.error("Failed to load submissions.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissions();
  }, [user]);

  /** 🔹 Answer change handler */
  const handleAnswerChange = (index: number, value: string, correctAnswer?: string) => {
    setPerQuestionResponses((prev) => {
      const next = { ...prev, [index]: value };
      if (selectedAssignment && studentId) void saveQuizDraft({ assignmentId: selectedAssignment, studentId, responses: next, essayText, savedAt: new Date().toISOString() });
      return next;
    });
    if (typeof correctAnswer !== "undefined") {
      const isCorrect =
        (value || "").trim().toLowerCase() === (correctAnswer || "").trim().toLowerCase();
      setPerQuestionFeedback((prev) => ({ ...prev, [index]: isCorrect }));
    } else {
      setPerQuestionFeedback((prev) => ({ ...prev, [index]: null }));
    }
  };

 const handleSubmit = async () => {
  if (!selectedAssignment || !studentClass || !studentId || !user) {
    toast.error("Please select an assignment before submitting.");
    return;
  }

  const selected = assignments.find((a) => a.id === selectedAssignment);
  useEffect(() => {
    if (!selected?.durationMinutes || !selectedAssignment) { setTimeLeft(null); return; }
    setTimeLeft(selected.durationMinutes * 60);
    const timer = window.setInterval(() => setTimeLeft(value => value === null ? null : Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [selected?.durationMinutes, selectedAssignment]);
  if (!selected) return;

  setUploading(true);
  try {
    let uploadedFileUrl: string | null = null;
    let responses: { question: string; selected: string; correct: boolean }[] = [];

    // 🔹 File upload (safe)
    if (selected.type === "file" && file) {
      const fileRef = ref(storage, `submissions/${studentId}/${file.name}`);
      await uploadBytes(fileRef, file);
      uploadedFileUrl = await getDownloadURL(fileRef);
    }

    // 🔹 Quiz / Objective (auto-mark)
    if (
      (selected.type === "quiz" || selected.type === "objective") &&
      selected.questions?.length
    ) {
      responses = selected.questions.map((q, i) => {
        const selectedValue = (perQuestionResponses[i] || "").toString();
        const isCorrect =
          (selectedValue || "").trim().toLowerCase() ===
          (q.answer || "").trim().toLowerCase();
        return { question: q.question, selected: selectedValue, correct: isCorrect };
      });
    }

    // 🔹 Short-answer auto-check
    if (selected.type === "short-answer" && selected.questions?.length) {
      responses = selected.questions.map((q, i) => {
        const studentAns = (perQuestionResponses[i] || "").trim().toLowerCase();
        const correctAns = (q.answer || "").trim().toLowerCase();
        const isCorrect = studentAns !== "" && studentAns === correctAns;
        return { question: q.question, selected: perQuestionResponses[i] || "", correct: isCorrect };
      });
    }

    // 🔹 Prepare submission data safely (no undefined fields)
    const existingQ = query(
      collection(db, "submissions"),
      where("studentId", "==", studentId),
      where("assignmentId", "==", selectedAssignment)
    );
    const existingSnap = await getDocs(existingQ);
    const previous = existingSnap.docs[0]?.data() as Submission | undefined;
    if (selected.maxAttempts && (previous?.attempts || 0) >= selected.maxAttempts) {
      toast.error(`You have reached the maximum of ${selected.maxAttempts} attempt${selected.maxAttempts === 1 ? "" : "s"}.`);
      return;
    }

    const submissionData: Submission = {
      assignmentId: selectedAssignment,
      assignmentName: selected.title,
      classId: studentClass,
      studentId,
      studentUid: user.uid,
      studentName: user.displayName || "Unnamed Student",
      ...(uploadedFileUrl ? { submissionUrl: uploadedFileUrl } : {}), // ✅ only if defined
      ...(selected.type === "essay" && essayText ? { responseText: essayText } : {}),
      ...(responses.length ? { responses } : {}),
      submittedAt: new Date().toISOString(),
      createdAt: serverTimestamp(),
      status: "submitted",
      attempts: (previous?.attempts || 0) + 1,
    };

    if (!existingSnap.empty) {
      await setDoc(doc(db, "submissions", existingSnap.docs[0].id), submissionData, { merge: true });
      toast.success("Submission updated successfully!");
    } else {
      await addDoc(collection(db, "submissions"), submissionData);
      toast.success("Submission uploaded successfully!");
    }

    // 🔹 Reset UI
    setFile(null);
    setEssayText("");
    setPerQuestionResponses({});
    setPerQuestionFeedback({});
    setSelectedAssignment("");
  } catch (err) {
    console.error("Upload error:", err);
    await queueQuizSubmission({ assignmentId: selectedAssignment, studentId, studentUid: user.uid, classId: studentClass, responses: perQuestionResponses, essayText, queuedAt: new Date().toISOString() });
    toast.error("Offline: your responses were saved for later synchronization.");
  } finally {
    setUploading(false);
  }
};


  const selected = assignments.find((a) => a.id === selectedAssignment);
  const totalSubmitted = submissions.length;
  const gradedCount = submissions.filter((s) => s.status === "graded").length;
  const pendingCount = totalSubmitted - gradedCount;

  return (
  <div className="min-h-screen bg-slate-50 p-6">
    {/* Header */}
    <div className="mb-8">
      <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
        <FileText className="text-primary" /> Assignment Submissions
      </h1>
      <p className="text-slate-600 mt-2">
        Submit and review your assignment progress here.
      </p>
    </div>

    {/* Main conditional */}
    {studentClass === null ? (
      <div className="bg-yellow-50 border border-yellow-300 text-yellow-700 p-4 rounded-xl">
        Not enrolled in any class yet.
      </div>
    ) : (
      <>
        {/* 🔹 Summary cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <div className="bg-white shadow rounded-2xl p-6 border border-slate-100 flex items-center gap-4">
            <ClipboardList className="text-blue-600 w-8 h-8" />
            <div>
              <p className="text-slate-500 text-sm">Total Submitted</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {totalSubmitted}
              </h3>
            </div>
          </div>

          <div className="bg-white shadow rounded-2xl p-6 border border-slate-100 flex items-center gap-4">
            <CheckCircle className="text-green-600 w-8 h-8" />
            <div>
              <p className="text-slate-500 text-sm">Graded</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {gradedCount}
              </h3>
            </div>
          </div>

          <div className="bg-white shadow rounded-2xl p-6 border border-slate-100 flex items-center gap-4">
            <Hourglass className="text-yellow-500 w-8 h-8" />
            <div>
              <p className="text-slate-500 text-sm">Pending</p>
              <h3 className="text-2xl font-bold text-slate-800">
                {pendingCount}
              </h3>
            </div>
          </div>
        </div>

        {/* 🔹 Assignment Details */}
        {selected && (
          <div className="bg-white rounded-2xl shadow p-6 mb-6 border border-slate-100">
            <h2 className="text-2xl font-semibold text-slate-800 mb-2">
              {selected.title}
            </h2>

            {/* 🔹 Show description + extract instruction */}
            {selected.description &&
              (() => {
                const desc = selected.description.trim();
                const [instruction, ...rest] = desc.split(/(?=\d+\.)|(?<=:)/);
                const numbered = rest
                  .join("")
                  .split(/\d+\./)
                  .map((x) => x.trim())
                  .filter(Boolean);
                return (
                  <div className="mb-6">
                    {instruction && (
                      <p className="font-semibold text-slate-800 text-lg mb-3">
                        Instruction:{" "}
                        <span className="font-normal text-slate-700">
                          {instruction.trim()}
                        </span>
                      </p>
                    )}
                    {numbered.length > 0 && (
                      <div className="space-y-6">
                        {numbered.map((q, i) => (
                          <div
                            key={i}
                            className="p-4 bg-slate-50 rounded-xl border border-slate-200 shadow-sm space-y-3"
                          >
                            <p className="text-slate-800 font-medium">
                              {i + 1}. {q}
                            </p>
                            <textarea
                              placeholder="Write your answer here..."
                              value={perQuestionResponses[i] || ""}
                              onChange={(e) =>
                                setPerQuestionResponses((prev) => ({
                                  ...prev,
                                  [i]: e.target.value,
                                }))
                              }
                              className="border border-slate-300 p-3 rounded-lg w-full min-h-[100px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}

            {/* 🔹 Quiz / Short Answer */}
            {(selected.type === "quiz" || selected.type === "short-answer") &&
              selected.questions && (
                <div className="space-y-6 mt-4">
                  {selected.questions.map((q, index) => (
                    <div key={index} className="border-b pb-4">
                      <p className="font-medium text-slate-800 mb-2">
                        {index + 1}. {q.question || "Untitled Question"}
                      </p>

                      {selected.type === "quiz" && (q.questionType === "fill-blank" ? (
                        <textarea placeholder="Type the missing answer" value={perQuestionResponses[index] || ""} onChange={(e) => handleAnswerChange(index, e.target.value, q.answer)} className="w-full rounded-lg border border-slate-300 p-2" />
                      ) :
                        Array.isArray(q.options) &&
                        q.options.length > 0 && (
                          <div className="space-y-2">
                            {q.options.map((opt, i) => {
                              const checked =
                                perQuestionResponses[index] === opt;
                              const feedback = perQuestionFeedback[index];
                              const base =
                                checked && feedback === true
                                  ? "bg-green-100 border-green-400"
                                  : checked && feedback === false
                                  ? "bg-red-100 border-red-400"
                                  : "hover:bg-slate-50";

                              return (
                                <label
                                  key={i}
                                  className={`block p-2 border rounded-lg cursor-pointer ${base}`}
                                >
                                  <input
                                    type="radio"
                                    name={`q-${index}`}
                                    value={opt}
                                    checked={checked}
                                    onChange={() =>
                                      handleAnswerChange(
                                        index,
                                        opt,
                                        q.answer
                                      )
                                    }
                                    className="mr-2"
                                  />
                                  {opt || "—"}
                                </label>
                              );
                            })}
                          </div>
                        ))}

                      {selected.type === "short-answer" && (
                        <textarea
                          placeholder="Type your answer here..."
                          value={perQuestionResponses[index] || ""}
                          onChange={(e) =>
                            handleAnswerChange(
                              index,
                              e.target.value,
                              q.answer
                            )
                          }
                          className="border border-slate-300 p-2 rounded-lg w-full min-h-[80px] focus:ring-2 focus:ring-blue-500 focus:outline-none"
                        />
                      )}

                      {typeof perQuestionFeedback[index] === "boolean" && (
                        <p
                          className={`mt-2 text-sm font-medium ${
                            perQuestionFeedback[index]
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {perQuestionFeedback[index]
                            ? "Correct ✅"
                            : `Incorrect ❌ (Answer: ${
                                q.answer || "N/A"
                              })`}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
          </div>
        )}

        {/* 🔹 Submission Section */}
        <div className="bg-white rounded-2xl shadow p-6 mb-8 border border-slate-100">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Upload className="text-blue-500" /> Submit Your Assignment
          </h2>

          <div className="flex flex-col gap-4">
            <select
              value={selectedAssignment}
              onChange={(e) => {
                setSelectedAssignment(e.target.value);
                setEssayText("");
                setPerQuestionResponses({});
                setPerQuestionFeedback({});
                setFile(null);
              }}
              className="border border-slate-300 p-2 rounded-lg w-full"
            >
              <option value="">Select Assignment</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title} ({a.type || "file"})
                </option>
              ))}
            </select>

            {selected && timeLeft !== null && <div className={`rounded-lg p-3 text-sm font-semibold ${timeLeft < 60 ? "bg-red-50 text-red-700" : "bg-primary text-primary"}`}>Time remaining: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}</div>}
            {selected?.type === "essay" &&
              !(
                (Array.isArray(selected?.questions) &&
                  selected.questions.length > 0) ||
                (selected?.description && /\d+\./.test(selected.description))
              ) && (
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  placeholder="Type your essay response here..."
                  className="border border-slate-300 p-2 rounded-lg w-full min-h-[160px]"
                />
              )}

            {["file", "essay", "project"].includes(selected?.type || "") && (
              <div className="space-y-3 mt-4 relative">
                <label className="block text-sm font-medium text-slate-700">
                  {selected?.type === "file"
                    ? "Upload your assignment file"
                    : "Upload supporting file (optional)"}
                </label>

                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.jpg,.png"
                  onChange={(e) =>
                    setFile(e.target.files?.[0] || null)
                  }
                  className="border border-slate-300 p-2 rounded-lg w-full focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />

                {file && (
                  <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm">
                    <div className="flex items-center gap-3">
                      {file.type.startsWith("image/") ? (
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewImage(
                              URL.createObjectURL(file)
                            )
                          }
                          className="block focus:outline-none"
                        >
                          <img
                            src={URL.createObjectURL(file)}
                            alt="preview"
                            className="w-10 h-10 object-cover rounded-lg border border-slate-300 hover:opacity-80 transition"
                          />
                        </button>
                      ) : (
                        <div className="w-10 h-10 bg-blue-100 flex items-center justify-center rounded-lg">
                          <span className="text-blue-600 font-bold text-sm">
                            {file.name
                              .split(".")
                              .pop()
                              ?.toUpperCase()}
                          </span>
                        </div>
                      )}

                      <div>
                        <p className="text-slate-800 font-medium truncate max-w-[180px]">
                          {file.name}
                        </p>
                        <p className="text-slate-500 text-xs">
                          {file.type || "Unknown type"} •{" "}
                          {(file.size / 1024).toFixed(1)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setFile(null)}
                      className="text-red-500 hover:text-red-700 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {previewImage && (
                  <div
                    className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 animate-fadeIn"
                    onClick={() => setPreviewImage(null)}
                  >
                    <div
                      className="relative bg-white rounded-xl shadow-2xl max-w-4xl w-[90%] p-4"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <img
                        src={previewImage}
                        alt="Full preview"
                        className="w-full h-auto rounded-lg"
                      />
                      <button
                        onClick={() => setPreviewImage(null)}
                        className="absolute top-3 right-3 bg-black/60 text-white rounded-full px-3 py-1 text-sm hover:bg-black"
                      >
                        ✕ Close
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={uploading || timeLeft === 0}
              className={`px-6 py-2 rounded-lg text-white font-medium transition ${
                uploading
                  ? "bg-slate-400 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {timeLeft === 0 ? "Time expired" : uploading ? "Submitting..." : "Submit"}
            </button>
          </div>
        </div>

        {/* 🔹 Submissions Table */}
        <div className="bg-white rounded-2xl shadow border border-slate-100">
          <div className="p-4 border-b">
            <h2 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <CheckCircle className="text-green-500" /> Your Previous
              Submissions
            </h2>
          </div>

          {loading ? (
            <div className="p-6 text-slate-500 text-center">
              Loading submissions...
            </div>
          ) : submissions.length === 0 ? (
            <div className="p-6 text-center text-slate-500">
              No submissions yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm text-left text-slate-700">
                <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                  <tr>
                    <th className="px-4 py-3">Assignment</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Submitted</th>
                    <th className="px-4 py-3">Feedback</th>
                  </tr>
                </thead>
                <tbody>
                  {submissions.map((sub) => (
                    <tr
                      key={sub.id}
                      className="border-b hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 font-medium">
                        {sub.assignmentName ||
                          sub.assignmentId ||
                          "—"}
                      </td>
                      <td className="px-4 py-3">
                        {sub.status === "graded" ? (
                          <span className="flex items-center gap-1 text-green-600">
                            <CheckCircle size={16} /> Graded
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-yellow-600">
                            <XCircle size={16} /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {sub.score ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        {formatSubmittedAt(sub.submittedAt)}
                      </td>
                      <td className="px-4 py-3">
                        {sub.feedback ? (
                          <span className="flex items-center gap-1 text-blue-600">
                            <MessageSquare size={16} />{" "}
                            {sub.feedback}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </>
    )}
  </div>
);
};
export default SubmissionsPage;
