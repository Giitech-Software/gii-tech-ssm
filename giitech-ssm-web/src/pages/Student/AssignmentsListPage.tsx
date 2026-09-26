import { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Calendar,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Assignment {
  id: string;
  title: string;
  classId: string;
  dueDate?: any; // Firestore Timestamp or string
  status?: string;
  type?: "short-answer" | "objective" | "essay";
  questions?: { question: string; answer?: string; options?: string[] }[];
}

export default function AssignmentsListPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [className, setClassName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) return;

    const fetchAssignments = async () => {
      setLoading(true);
      try {
        // 1️⃣ Find student document by userId
        const studentQ = query(
          collection(db, "students"),
          where("userId", "==", user.uid)
        );
        const studentSnap = await getDocs(studentQ);

        if (studentSnap.empty) {
          setAssignments([]);
          setClassName("");
          setLoading(false);
          return;
        }

        const studentDoc = studentSnap.docs[0].data();
        const classId = studentDoc.classId;

        if (!classId) {
          setAssignments([]);
          setClassName("");
          setLoading(false);
          return;
        }

        // 2️⃣ Get class name using classId field (not doc ID)
        const classQ = query(
          collection(db, "classes"),
          where("classId", "==", classId)
        );
        const classSnap = await getDocs(classQ);
        if (!classSnap.empty) {
          const c = classSnap.docs[0].data() as any;
          setClassName(c.name || c.title || c.classId || "Unknown");
        } else {
          setClassName(classId);
        }

        // 3️⃣ Fetch assignments belonging to that class
        const assignmentQ = query(
          collection(db, "assignments"),
          where("classId", "==", classId)
        );
        const assignmentSnap = await getDocs(assignmentQ);

        const list = assignmentSnap.docs.map((d) => {
          const data = d.data() as Assignment;
          return { ...data, id: d.id };
        });
        setAssignments(list);
      } catch (err) {
        console.error("fetchAssignments error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAssignments();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64 text-slate-500">
        Loading assignments...
      </div>
    );
  }

  // 🔹 Convert Firestore timestamp or string safely
  const formatDate = (dateValue: any): string => {
    if (!dateValue) return "No due date";
    try {
      if (dateValue.toDate) {
        return dateValue.toDate().toLocaleDateString();
      } else {
        return new Date(dateValue).toLocaleDateString();
      }
    } catch {
      return "Invalid date";
    }
  };

  // 🔹 Stats
  const total = assignments.length;
  const now = new Date();
  const dueSoon = assignments.filter((a) => {
    if (!a.dueDate) return false;
    const due = a.dueDate.toDate ? a.dueDate.toDate() : new Date(a.dueDate);
    const diff = due.getTime() - now.getTime();
    return diff <= 3 * 24 * 60 * 60 * 1000 && diff > 0;
  }).length;
  const completed = assignments.filter((a) => a.status === "submitted").length;

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <h1 className="text-3xl font-bold text-slate-800 mb-6 flex items-center gap-2">
        <FileText className="text-blue-600" /> Your Assignments
      </h1>

      {/* 🔹 Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8">
        <StatCard
          label="Total Assigned"
          value={total}
          icon={<FileText className="text-blue-600" size={36} />}
        />
        <StatCard
          label="Due Soon (3 days)"
          value={dueSoon}
          icon={<Clock className="text-yellow-500" size={36} />}
          color="text-yellow-600"
        />
        <StatCard
          label="Completed"
          value={completed}
          icon={<CheckCircle className="text-green-500" size={36} />}
          color="text-green-600"
        />
      </div>

      {/* 🔹 Assignment Cards */}
      {assignments.length === 0 ? (
        <div className="text-center text-slate-500 mt-20">
          <AlertTriangle className="mx-auto mb-3 text-yellow-500" size={40} />
          <p>No assignments found yet.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="bg-white shadow rounded-2xl p-5 hover:shadow-lg transition-all border border-slate-100"
            >
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg font-semibold text-slate-800">
                  {a.title || "Untitled Assignment"}
                </h2>
                <CheckCircle
                  size={22}
                  className={
                    a.status === "submitted"
                      ? "text-green-500"
                      : "text-slate-300"
                  }
                />
              </div>

              <p className="text-sm text-slate-600 mb-2">
                Class:{" "}
                <span className="font-medium">
                  {className || a.classId || "Unknown"}
                </span>
              </p>

              <p className="text-sm text-slate-500 flex items-center gap-1">
                <Calendar size={16} /> {formatDate(a.dueDate)}
              </p>

              <div className="mt-4">
                <button
                  onClick={() =>
                    navigate(
                      `/student/submissions?assignmentId=${a.id}&classId=${a.classId}`
                    )
                  }
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition"
                >
                  View / Submit
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* 🔹 Helper Components */
const StatCard = ({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color?: string;
}) => (
  <div className="bg-white rounded-2xl p-5 shadow border border-slate-100 flex items-center justify-between">
    <div>
      <p className="text-sm text-slate-500">{label}</p>
      <h3 className={`text-2xl font-bold ${color || "text-slate-800"}`}>
        {value}
      </h3>
    </div>
    {icon}
  </div>
);
