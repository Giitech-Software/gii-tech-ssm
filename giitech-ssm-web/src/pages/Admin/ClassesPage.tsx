import { useEffect, useState } from "react";
import { fetchClasses, addClass, deleteClass } from "../../services/ClassService";
import { getDepartments } from "../../services/departmentService";
import { PlusCircle, Trash2, Loader2 } from "lucide-react";

export default function ClassesPage() {
  const [classes, setClasses] = useState<any[]>([]);
  const [departments, setDepartments] = useState<any[]>([]);
  const [newClass, setNewClass] = useState({ name: "", departmentId: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // --- Load departments and classes ---
  const loadData = async () => {
    setLoading(true);
    try {
      const [deptData, classData] = await Promise.all([
        getDepartments(),
        fetchClasses(),
      ]);
      setDepartments(deptData);
      setClasses(classData);
    } catch (err) {
      console.error("Error loading data:", err);
      setMessage("❌ Failed to load classes or departments");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- Add class ---
  const handleAddClass = async () => {
    if (!newClass.name.trim() || !newClass.departmentId.trim()) {
      setMessage("⚠️ Please enter Class Name and select Department");
      return;
    }

    try {
      setLoading(true);
      const department = departments.find(d => d.departmentId === newClass.departmentId);
      await addClass(newClass.name, newClass.departmentId, department?.name || '');
      setNewClass({ name: "", departmentId: "" });
      setMessage("✅ Class added successfully!");
      await loadData();
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to add class");
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // --- Delete class ---
  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this class?")) return;
    try {
      await deleteClass(id);
      setClasses(classes.filter((cls) => cls.id !== id));
      setMessage("🗑️ Class deleted");
    } catch (err) {
      console.error(err);
      setMessage("❌ Failed to delete class");
    } finally {
      setTimeout(() => setMessage(""), 3000);
    }
  };

  // --- UI ---
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold mb-6 text-gray-700">Manage Classes</h1>

      {message && (
        <div className="mb-4 p-3 bg-blue-100 text-blue-700 rounded">{message}</div>
      )}

      {/* --- Add Class Form --- */}
      <div className="flex flex-wrap gap-3 mb-6">
        <input
          type="text"
          placeholder="Class Name"
          value={newClass.name}
          onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
          className="border p-2 rounded flex-1 min-w-[200px]"
        />

        <select
          value={newClass.departmentId}
          onChange={(e) => setNewClass({ ...newClass, departmentId: e.target.value })}
          className="border p-2 rounded flex-1 min-w-[200px]"
        >
          <option value="">Select Department</option>
          {departments.map((dept) => (
            <option key={dept.id} value={dept.departmentId || dept.id}>
              {dept.departmentId || dept.id} — {dept.name}
            </option>
          ))}
        </select>

        <button
          onClick={handleAddClass}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded flex items-center gap-2"
          disabled={loading}
        >
          {loading ? <Loader2 size={18} className="animate-spin" /> : <PlusCircle size={18} />}
          Add Class
        </button>
      </div>

      {/* --- Table --- */}
      {loading ? (
        <p className="text-gray-500">Loading classes...</p>
      ) : (
        <table className="w-full bg-white shadow rounded">
          <thead className="bg-blue-100">
            <tr>
              <th className="p-3 text-left">Class ID</th>
              <th className="p-3 text-left">Class Name</th>
              <th className="p-3 text-left">Department</th>
              <th className="p-3 text-left">Created</th>
              <th className="p-3 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {classes.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-4 text-center text-gray-500">
                  No classes found.
                </td>
              </tr>
            ) : (
              classes.map((cls) => {
                const relatedDept = departments.find(
                  (d) => d.departmentId === cls.departmentId
                );
                return (
                  <tr key={cls.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-gray-500">{cls.classId || cls.id}</td>
                    <td className="p-3">{cls.name}</td>
                    <td className="p-3">
                      {relatedDept
                        ? `${relatedDept.departmentId} — ${relatedDept.name}`
                        : cls.departmentId || "—"}
                    </td>
                    <td className="p-3">
                      {cls.createdAt?.toDate
                        ? cls.createdAt.toDate().toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3">
                      <button
                        onClick={() => handleDelete(cls.id)}
                        className="text-red-600 hover:text-red-800 flex items-center gap-1"
                      >
                        <Trash2 size={16} /> Delete
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      )}
    </div>
  );
}
