import { useEffect, useState } from "react";
import {
  getDepartments,
  addDepartment,
  updateDepartment,
  deleteDepartment,
} from "../../services/departmentService";

const DepartmentsPage = () => {
  const [departments, setDepartments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [head, setHead] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    fetchDepartments();
  }, []);

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error("Error fetching departments:", err);
      alert("Error fetching departments. Check permissions or Firestore rules.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddOrUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Please enter a department name.");

    try {
      if (editingId) {
        await updateDepartment(editingId, name, head);
        alert("Department updated successfully!");
      } else {
        await addDepartment(name, head);
        alert("Department added successfully!");
      }

      setName("");
      setHead("");
      setEditingId(null);
      await fetchDepartments();
    } catch (err: any) {
      console.error("Error saving department:", err);
      alert(`Failed to save department: ${err.message}`);
    }
  };

  const handleEdit = (dept: any) => {
    setEditingId(dept.id);
    setName(dept.name);
    setHead(dept.head);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this department?")) return;
    try {
      await deleteDepartment(id);
      await fetchDepartments();
      alert("Department deleted.");
    } catch (err: any) {
      alert(`Failed to delete department: ${err.message}`);
    }
  };

  if (loading) return <div className="p-4">Loading departments...</div>;

  return (
    <div className="p-4 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Manage Departments</h1>

      {/* Form */}
      <form onSubmit={handleAddOrUpdate} className="mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Department Name"
            className="border rounded p-2 w-full"
          />
          <input
            type="text"
            value={head}
            onChange={(e) => setHead(e.target.value)}
            placeholder="Department Head"
            className="border rounded p-2 w-full"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          {editingId ? "Save Changes" : "Add Department"}
        </button>
        {editingId && (
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setName("");
              setHead("");
            }}
            className="ml-2 text-gray-500 hover:underline"
          >
            Cancel
          </button>
        )}
      </form>

      {/* Table */}
      <table className="min-w-full border">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border">ID</th>
            <th className="p-2 border">Name</th>
            <th className="p-2 border">Head</th>
            <th className="p-2 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {departments.map((dept) => (
            <tr key={dept.id} className="border-t">
              <td className="p-2 border text-gray-500 text-sm">{dept.id}</td>
              <td className="p-2 border">{dept.name}</td>
              <td className="p-2 border">{dept.head || "-"}</td>
              <td className="p-2 border">
                <button
                  onClick={() => handleEdit(dept)}
                  className="text-blue-500 hover:underline mr-2"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(dept.id)}
                  className="text-red-500 hover:underline"
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
          {departments.length === 0 && (
            <tr>
              <td colSpan={4} className="p-3 text-center text-gray-500">
                No departments found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default DepartmentsPage;
