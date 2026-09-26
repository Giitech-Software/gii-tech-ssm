import React, { useState, useEffect } from "react";
import {
  BookOpen,
  CalendarDays,
  Trash2,
  Edit3,
  Save,
  PlusCircle,
  ListChecks,
} from "lucide-react";
import toast from "react-hot-toast";
import { useAuth } from "../../contexts/AuthContext";
import {
  fetchAssignmentsByTeacher,
  addAssignment,
  updateAssignment,
  deleteAssignment,
} from "../../services/assignmentService";
import { getDocs, collection } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import type { Assignment as AssignmentType } from "../../services/assignmentService";

// ✅ Extend Assignment type
interface ExtendedAssignment extends AssignmentType {
  type?: "short-answer" | "objective" | "essay";
  departmentId?: string;
  questions?: {
    question: string;
    answer: string;
    options?: string[];
    questionType?: "multiple-choice" | "true-false" | "fill-blank";
  }[];
}

const currentAcademicYear = () => {
  const year = new Date().getFullYear();
  return `${year}/${year + 1}`;
};

// ✅ Helper to format Firestore Timestamps safely
const formatDueDate = (dueDate: any) => {
  if (!dueDate) return "—";
  try {
    if (dueDate.toDate) return dueDate.toDate().toLocaleDateString();
    if (typeof dueDate === "string") return new Date(dueDate).toLocaleDateString();
    if (dueDate instanceof Date) return dueDate.toLocaleDateString();
    return "Invalid date";
  } catch {
    return "Invalid date";
  }
};

const TeacherAssignmentsPage: React.FC = () => {
  const { user } = useAuth();

  const [assignments, setAssignments] = useState<ExtendedAssignment[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name?: string }[]>([]);
  const [classes, setClasses] = useState<{ id: string; name?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, boolean>>({});

  const [newAssignment, setNewAssignment] = useState<ExtendedAssignment>({
    title: "",
    subject: "",
    description: "",
    dueDate: "",
    classId: "",
    departmentId: "",
    academicYear: currentAcademicYear(),
    term: "Term 1",
    type: "short-answer",
    questions: [],
  });

  // ✅ Load teacher-specific assignments, departments, and classes
  useEffect(() => {
    const loadData = async () => {
      try {
        if (!user?.uid) return;

        const [assignData, deptSnap, classSnap] = await Promise.all([
          fetchAssignmentsByTeacher(), // ✅ auto-detects logged-in teacher
          getDocs(collection(db, "departments")),
          getDocs(collection(db, "classes")),
        ]);

        setAssignments(assignData as ExtendedAssignment[]);
        setDepartments(deptSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
        setClasses(classSnap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })));
      } catch (error) {
        console.error("Error loading data:", error);
        toast.error("Failed to load assignments");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, [user]);

  // ✅ Create assignment
  const handleCreate = async () => {
    const requiredFields = ["title", "subject", "classId", "dueDate"];
    const newErrors: Record<string, boolean> = {};

    requiredFields.forEach((field) => {
      if (!(newAssignment as any)[field]) newErrors[field] = true;
    });

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      const newData: ExtendedAssignment = {
        ...newAssignment,
        teacherId: user?.uid || "tch001",
        createdAt: new Date(),
      };

      await addAssignment(newData);
      toast.success("Assignment created successfully!");

      const updated = (await fetchAssignmentsByTeacher()) as ExtendedAssignment[];
      setAssignments(updated);

      setNewAssignment({
        title: "",
        subject: "",
        description: "",
        dueDate: "",
        classId: "",
        departmentId: "",
        academicYear: currentAcademicYear(),
        term: "Term 1",
        type: "short-answer",
        questions: [],
      });
      setErrors({});
    } catch (error) {
      console.error("Error creating assignment:", error);
      toast.error("Failed to create assignment");
    }
  };

  // ✅ Delete assignment
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this assignment?")) return;
    try {
      await deleteAssignment(id);
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      toast.success("Assignment deleted");
    } catch (error) {
      console.error("Error deleting assignment:", error);
      toast.error("Failed to delete");
    }
  };

  // ✅ Save edits
  const handleSaveEdit = async (assignment: ExtendedAssignment) => {
    try {
      await updateAssignment(assignment.id!, assignment);
      setAssignments((prev) =>
        prev.map((a) => (a.id === assignment.id ? assignment : a))
      );
      setEditingId(null);
      toast.success("Assignment updated");
    } catch (error) {
      console.error("Error updating assignment:", error);
      toast.error("Failed to update");
    }
  };

  // ✅ Add question
  const handleAddQuestion = () => {
    setNewAssignment((prev) => ({
      ...prev,
      questions: [
        ...(prev.questions || []),
        { question: "", answer: "", options: ["", "", "", ""], questionType: "multiple-choice" },
      ],
    }));
  };

  const handleQuestionChange = (
    index: number,
    field: "question" | "answer" | "options" | "questionType",
    value: any
  ) => {
    const updated = [...(newAssignment.questions || [])];
    (updated[index] as any)[field] = value;
    setNewAssignment((prev) => ({ ...prev, questions: updated }));
  };

  const inputClass = (field: string) =>
    `border p-2 rounded-lg w-full ${
      errors[field] ? "border-red-500 focus:border-red-500" : "border-slate-300"
    }`;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="text-primary" /> Teacher Assignments
        </h1>
        <p className="text-slate-600 mt-2">
          Create and manage assignments — auto-marked for short answers and MCQs.
        </p>
      </div>

      {/* Create Assignment */}
      <div className="bg-white rounded-2xl shadow p-6 mb-8 border border-slate-100">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <PlusCircle className="text-green-500" /> Create Assignment
        </h2>

        {/* Form Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Title */}
          <div>
            <input
              type="text"
              placeholder="Title *"
              value={newAssignment.title}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, title: e.target.value })
              }
              className={inputClass("title")}
            />
            {errors.title && (
              <p className="text-xs text-red-500 mt-1">Title is required</p>
            )}
          </div>

          {/* Subject */}
          <div>
            <input
              type="text"
              placeholder="Subject *"
              value={newAssignment.subject}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, subject: e.target.value })
              }
              className={inputClass("subject")}
            />
            {errors.subject && (
              <p className="text-xs text-red-500 mt-1">Subject is required</p>
            )}
          </div>

          {/* Department */}
          <select
            value={newAssignment.departmentId || ""}
            onChange={(e) =>
              setNewAssignment({ ...newAssignment, departmentId: e.target.value })
            }
            className={inputClass("departmentId")}
          >
            <option value="">Select Department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name || d.id}
              </option>
            ))}
          </select>

          {/* Class */}
          <div>
            <select
              value={newAssignment.classId || ""}
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, classId: e.target.value })
              }
              className={inputClass("classId")}
            >
              <option value="">Select Class *</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name || c.id}
                </option>
              ))}
            </select>
            {errors.classId && (
              <p className="text-xs text-red-500 mt-1">Class is required</p>
            )}
          </div>

          {/* Due Date */}
          <div>
            <input
              type="date"
              value={
                typeof newAssignment.dueDate === "string"
                  ? newAssignment.dueDate
                  : ""
              }
              onChange={(e) =>
                setNewAssignment({ ...newAssignment, dueDate: e.target.value })
              }
              className={inputClass("dueDate")}
            />
            {errors.dueDate && (
              <p className="text-xs text-red-500 mt-1">Due date is required</p>
            )}
          </div>

          <input
            type="text"
            placeholder="Academic year"
            value={newAssignment.academicYear || ""}
            onChange={(e) =>
              setNewAssignment({ ...newAssignment, academicYear: e.target.value })
            }
            className={inputClass("academicYear")}
          />

          <select
            value={newAssignment.term || ""}
            onChange={(e) =>
              setNewAssignment({ ...newAssignment, term: e.target.value })
            }
            className={inputClass("term")}
          >
            <option value="Term 1">Term 1</option>
            <option value="Term 2">Term 2</option>
            <option value="Term 3">Term 3</option>
          </select>

          {/* Type */}
          <select
            value={newAssignment.type}
            onChange={(e) =>
              setNewAssignment({
                ...newAssignment,
                type: e.target.value as "short-answer" | "objective" | "essay",
                questions: [],
              })
            }
            className="border border-slate-300 p-2 rounded-lg w-full"
          >
            <option value="short-answer">Short Answer</option>
            <option value="objective">Objective (MCQ)</option>
            <option value="essay">Essay</option>
          </select>
          <input type="number" min="0" placeholder="Quiz time limit (minutes, optional)" value={newAssignment.durationMinutes || ""} onChange={(e) => setNewAssignment({ ...newAssignment, durationMinutes: e.target.value ? Number(e.target.value) : undefined })} className="border border-slate-300 p-2 rounded-lg w-full" />
          <input type="number" min="1" placeholder="Maximum attempts (optional)" value={newAssignment.maxAttempts || ""} onChange={(e) => setNewAssignment({ ...newAssignment, maxAttempts: e.target.value ? Number(e.target.value) : undefined })} className="border border-slate-300 p-2 rounded-lg w-full" />
        </div>

        {/* Description */}
        <textarea
          placeholder="Description"
          value={newAssignment.description}
          onChange={(e) =>
            setNewAssignment({ ...newAssignment, description: e.target.value })
          }
          className="border border-slate-300 p-2 rounded-lg w-full mt-4"
          rows={3}
        />

        {/* Questions Section */}
        {(newAssignment.type === "objective" ||
          newAssignment.type === "short-answer") && (
          <div className="mt-6 border-t pt-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700 flex items-center gap-2">
                <ListChecks className="text-blue-500" /> Questions
              </h3>
              <button
                onClick={handleAddQuestion}
                className="text-sm bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700"
              >
                + Add Question
              </button>
            </div>

            {newAssignment.questions?.map((q, i) => (
              <div
                key={i}
                className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-200"
              >
                <input
                  type="text"
                  placeholder={`Question ${i + 1}`}
                  value={q.question}
                  onChange={(e) =>
                    handleQuestionChange(i, "question", e.target.value)
                  }
                  className="border p-2 rounded w-full mb-2"
                />
                {newAssignment.type === "objective" && <select value={q.questionType || "multiple-choice"} onChange={(e) => { const nextType = e.target.value as "multiple-choice" | "true-false" | "fill-blank"; handleQuestionChange(i, "questionType", nextType); handleQuestionChange(i, "options", nextType === "true-false" ? ["True", "False"] : nextType === "multiple-choice" ? ["", "", "", ""] : []); }} className="mb-2 rounded border p-2 text-sm"><option value="multiple-choice">Multiple choice</option><option value="true-false">True / False</option><option value="fill-blank">Fill in the blank</option></select>}
                {newAssignment.type === "objective" && (q.questionType || "multiple-choice") !== "fill-blank" &&
                  q.options?.map((opt, idx) => (
                    <input
                      key={idx}
                      type="text"
                      placeholder={`Option ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const updatedOptions = [...(q.options || [])];
                        updatedOptions[idx] = e.target.value;
                        handleQuestionChange(i, "options", updatedOptions);
                      }}
                      className="border p-2 rounded w-full mb-1"
                    />
                  ))}
                <input
                  type="text"
                  placeholder="Correct Answer"
                  value={q.answer}
                  onChange={(e) =>
                    handleQuestionChange(i, "answer", e.target.value)
                  }
                  className="border p-2 rounded w-full"
                />
              </div>
            ))}
          </div>
        )}

        <div className="mt-6">
          <button
            onClick={handleCreate}
            className="bg-primary text-white rounded-lg px-5 py-2 hover:bg-primary transition"
          >
            Create Assignment
          </button>
        </div>
      </div>

      {/* Assignment List */}
      <div className="bg-white rounded-2xl shadow border border-slate-100">
        <div className="p-4 border-b flex items-center gap-2">
          <CalendarDays className="text-blue-500" />
          <h2 className="text-lg font-semibold text-slate-800">
            Existing Assignments
          </h2>
        </div>

        {loading ? (
          <div className="p-6 text-center text-slate-500">
            Loading assignments...
          </div>
        ) : assignments.length === 0 ? (
          <div className="p-6 text-center text-slate-500">
            No assignments yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm text-left text-slate-700">
              <thead className="bg-slate-100 text-slate-600 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Title</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Class</th>
                  <th className="px-4 py-3">Due Date</th>
                  <th className="px-4 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => (
                  <tr key={a.id} className="border-b hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium">{a.title}</td>
                    <td className="px-4 py-3 capitalize">{a.type}</td>
                    <td className="px-4 py-3">{a.classId}</td>
                    <td className="px-4 py-3">{formatDueDate(a.dueDate)}</td>
                    <td className="px-4 py-3 text-center flex justify-center gap-2">
                      {editingId === a.id ? (
                        <button
                          onClick={() => handleSaveEdit(a)}
                          className="bg-green-600 text-white p-2 rounded-md hover:bg-green-700"
                        >
                          <Save size={16} />
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingId(a.id!)}
                          className="bg-blue-600 text-white p-2 rounded-md hover:bg-blue-700"
                        >
                          <Edit3 size={16} />
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(a.id!)}
                        className="bg-red-600 text-white p-2 rounded-md hover:bg-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherAssignmentsPage;
