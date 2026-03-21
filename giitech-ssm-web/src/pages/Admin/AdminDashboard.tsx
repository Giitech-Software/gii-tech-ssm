// src/pages/Admin/AdminDashboard.tsx
import { useState, useEffect } from "react";
import { useAuth } from "../../contexts/AuthContext";
import { db } from "../../firebaseConfig";
import { Link } from "react-router-dom";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import {
  PlusCircle,
  Users,
  BookOpen,
  CreditCard,
  Activity,
  LogOut,
  Building2,
  Layers,
  SplitSquareHorizontal,
  FileBarChart2, // Reports hub icon
} from "lucide-react";

export default function AdminDashboard() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState("teachers");
  const [teachers, setTeachers] = useState<any[]>([]);
  const [newTeacher, setNewTeacher] = useState({
    displayName: "",
    email: "",
    department: "",
  });

  // 🔹 Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "teachers"));
        setTeachers(
          querySnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }))
        );
      } catch (error) {
        console.error("Error fetching teachers:", error);
      }
    };
    fetchTeachers();
  }, []);

  // 🔹 Add new teacher
  const handleAddTeacher = async () => {
    if (!newTeacher.displayName || !newTeacher.email)
      return alert("Please fill all fields");
    try {
      await addDoc(collection(db, "teachers"), newTeacher);
      setNewTeacher({ displayName: "", email: "", department: "" });
      alert("Teacher added successfully!");
    } catch (error) {
      console.error("Error adding teacher:", error);
    }
  };

  // 🔹 Delete teacher
  const handleDeleteTeacher = async (id: string) => {
    try {
      await deleteDoc(doc(db, "teachers", id));
      setTeachers((prev) => prev.filter((t) => t.id !== id));
      alert("Teacher deleted successfully!");
    } catch (error) {
      console.error("Error deleting teacher:", error);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <aside className="w-64 bg-blue-800 text-white flex flex-col p-4">
        <h2 className="text-2xl font-bold mb-6 text-center">Admin Panel ⚡</h2>

        <nav className="flex flex-col space-y-3">
          <button
            onClick={() => setActiveTab("teachers")}
            className={`flex items-center gap-2 p-2 rounded ${
              activeTab === "teachers" ? "bg-blue-600" : ""
            }`}
          >
            <Users size={18} /> Teachers
          </button>

          <button
            onClick={() => setActiveTab("students")}
            className={`flex items-center gap-2 p-2 rounded ${
              activeTab === "students" ? "bg-blue-600" : ""
            }`}
          >
            <BookOpen size={18} /> Students
          </button>

          <Link
            to="/admin/classes"
            className="flex items-center gap-2 p-2 rounded hover:bg-blue-600 transition"
          >
            <Layers size={18} /> Manage Classes
          </Link>

          <Link
            to="/admin/streams"
            className="flex items-center gap-2 p-2 rounded hover:bg-blue-600 transition"
          >
            <SplitSquareHorizontal size={18} /> Manage Streams
          </Link>

          <Link
            to="/admin/departments"
            className="flex items-center gap-2 p-2 rounded hover:bg-blue-600 transition"
          >
            <Building2 size={18} /> Manage Departments
          </Link>

          <Link
            to="/admin/fees"
            className="flex items-center gap-2 p-2 rounded hover:bg-blue-600 transition"
          >
            <CreditCard size={18} /> Manage Fees
          </Link>

          {/* 🔹 Reports Hub Link */}
          <Link
            to="/admin/reports"
            className="flex items-center gap-2 p-2 rounded hover:bg-blue-600 transition"
          >
            <FileBarChart2 size={18} /> Reports Hub
          </Link>

          <button
            onClick={() => setActiveTab("activity")}
            className={`flex items-center gap-2 p-2 rounded ${
              activeTab === "activity" ? "bg-blue-600" : ""
            }`}
          >
            <Activity size={18} /> Logs
          </button>
        </nav>

        <div className="mt-auto pt-6 border-t border-blue-700">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 py-2 rounded"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <h1 className="text-3xl font-bold mb-4 text-gray-700">
          Admin Dashboard
        </h1>

        {/* Teachers Section */}
        {activeTab === "teachers" && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Manage Teachers</h2>

            <div className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Full Name"
                value={newTeacher.displayName}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, displayName: e.target.value })
                }
                className="border p-2 rounded w-1/3"
              />
              <input
                type="email"
                placeholder="Email"
                value={newTeacher.email}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, email: e.target.value })
                }
                className="border p-2 rounded w-1/3"
              />
              <input
                type="text"
                placeholder="Department"
                value={newTeacher.department}
                onChange={(e) =>
                  setNewTeacher({ ...newTeacher, department: e.target.value })
                }
                className="border p-2 rounded w-1/3"
              />
              <button
                onClick={handleAddTeacher}
                className="bg-blue-600 text-white px-4 py-2 rounded flex items-center gap-2"
              >
                <PlusCircle size={18} /> Add
              </button>
            </div>

            <table className="w-full bg-white rounded shadow">
              <thead>
                <tr className="bg-blue-100 text-left">
                  <th className="p-3">Name</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Department</th>
                  <th className="p-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <tr key={teacher.id} className="border-b">
                    <td className="p-3">{teacher.displayName}</td>
                    <td className="p-3">{teacher.email}</td>
                    <td className="p-3">{teacher.department}</td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDeleteTeacher(teacher.id)}
                        className="text-red-500 hover:underline"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {/* Placeholder for other tabs */}
        {activeTab === "students" && (
          <p className="text-gray-600">Students management coming soon...</p>
        )}
        {activeTab === "activity" && (
          <p className="text-gray-600">Activity logs coming soon...</p>
        )}
      </main>
    </div>
  );
}
