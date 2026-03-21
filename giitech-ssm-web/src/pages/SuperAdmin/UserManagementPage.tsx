import { useEffect, useState } from "react";
import { fetchAllUsers, deleteUser } from "../../services/UserService";
import type { UserRecord } from "../../services/UserService";
import { useAuth } from "../../contexts/AuthContext";
import { logActivity } from "../../utils/firestoreHelpers";

export default function UserManagementPage() {
  const { user, role } = useAuth(); // ✅ fixed: changed currentUser → user
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserRecord[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (role !== "superadmin") {
      setError("Access denied. Only Super Admins can view this page.");
      setLoading(false);
      return;
    }

    const loadUsers = async () => {
      try {
        const all = await fetchAllUsers();
        setUsers(all);
        setFilteredUsers(all);
      } catch (err: any) {
        setError(err.message || "Failed to fetch users.");
      } finally {
        setLoading(false);
      }
    };

    loadUsers();
  }, [role]);

  /** Filter by role */
  const handleRoleFilter = (value: string) => {
    setSelectedRole(value);
    if (value === "all") setFilteredUsers(users);
    else setFilteredUsers(users.filter((u) => u.role === value));
  };

  /** Delete user */
  const handleDelete = async (uid: string, displayName: string) => {
    if (!window.confirm(`Delete ${displayName}? This cannot be undone.`)) return;
    try {
      await deleteUser(uid);
      await logActivity(user?.uid || "", "delete_user", { uid, displayName });
      setUsers((prev) => prev.filter((u) => u.uid !== uid));
      setFilteredUsers((prev) => prev.filter((u) => u.uid !== uid));
    } catch (err: any) {
      alert(`Error deleting user: ${err.message}`);
    }
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-600 animate-pulse">Loading users...</p>
      </div>
    );

  if (error)
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-600">{error}</p>
      </div>
    );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-primary mb-6">User Management</h1>

      {/* Filter */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <label className="mr-2 text-sm font-medium">Filter by role:</label>
          <select
            value={selectedRole}
            onChange={(e) => handleRoleFilter(e.target.value)}
            className="border rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="all">All</option>
            <option value="student">Students</option>
            <option value="parent">Parents</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold text-gray-700">#</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Name</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Email</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Role</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Created</th>
              <th className="px-4 py-2 font-semibold text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-6 text-gray-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, i) => (
                <tr key={u.uid} className="border-t hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-2 text-gray-600">{i + 1}</td>
                  <td className="px-4 py-2">{u.displayName}</td>
                  <td className="px-4 py-2 text-gray-600">{u.email}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2 text-gray-500">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString()
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <button
                      onClick={() => handleDelete(u.uid, u.displayName)}
                      className="text-red-600 hover:text-red-800 font-medium"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
