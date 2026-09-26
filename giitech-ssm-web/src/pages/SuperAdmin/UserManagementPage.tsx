import { useEffect, useState } from "react";
import { fetchAllUsers, deleteUser, updateUserSecurity } from "../../services/UserService";
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
  const [savingUid, setSavingUid] = useState<string | null>(null);

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

  const handleSecurity = async (target: UserRecord, changes: { status?: "active" | "disabled"; locked?: boolean }) => {
    if (target.uid === user?.uid) {
      alert("You cannot disable or lock your own account.");
      return;
    }
    const action = changes.status === "disabled" ? "disable" : changes.status === "active" ? "reactivate" : changes.locked ? "lock" : "unlock";
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${target.displayName}'s account?`)) return;
    setSavingUid(target.uid);
    try {
      await updateUserSecurity(target.uid, changes);
      await logActivity(user?.uid || "", `${action}_user`, { uid: target.uid, displayName: target.displayName });
      const updated = { ...target, ...changes };
      setUsers((prev) => prev.map((item) => item.uid === target.uid ? updated : item));
      setFilteredUsers((prev) => prev.map((item) => item.uid === target.uid ? updated : item));
    } catch (err: any) {
      alert(`Error updating account: ${err.message}`);
    } finally {
      setSavingUid(null);
    }
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
        <p className="text-slate-600 animate-pulse">Loading users...</p>
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
            <option value="staff">Non-teaching staff</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto bg-white rounded-xl shadow">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-left">
            <tr>
              <th className="px-4 py-2 font-semibold text-slate-700">#</th>
              <th className="px-4 py-2 font-semibold text-slate-700">Name</th>
              <th className="px-4 py-2 font-semibold text-slate-700">Email</th>
              <th className="px-4 py-2 font-semibold text-slate-700">Role</th>
              <th className="px-4 py-2 font-semibold text-slate-700">Security</th>
              <th className="px-4 py-2 font-semibold text-slate-700">Created</th>
              <th className="px-4 py-2 font-semibold text-slate-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="text-center py-6 text-slate-500">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((u, i) => (
                <tr key={u.uid} className="border-t hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-2 text-slate-600">{i + 1}</td>
                  <td className="px-4 py-2">{u.displayName}</td>
                  <td className="px-4 py-2 text-slate-600">{u.email}</td>
                  <td className="px-4 py-2 capitalize">{u.role}</td>
                  <td className="px-4 py-2">
                    <div className="mb-2 flex flex-wrap gap-1">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${u.status === "disabled" ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{u.status === "disabled" ? "Disabled" : "Active"}</span>
                      {u.locked && <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">Locked</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-medium">
                      <button disabled={savingUid === u.uid || u.uid === user?.uid} onClick={() => void handleSecurity(u, { status: u.status === "disabled" ? "active" : "disabled" })} className="text-primary disabled:opacity-40">{u.status === "disabled" ? "Reactivate" : "Disable"}</button>
                      <button disabled={savingUid === u.uid || u.uid === user?.uid} onClick={() => void handleSecurity(u, { locked: !u.locked })} className="text-amber-700 disabled:opacity-40">{u.locked ? "Unlock" : "Lock"}</button>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-slate-500">
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
