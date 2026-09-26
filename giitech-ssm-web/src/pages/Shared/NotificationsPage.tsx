import { useEffect, useState } from "react";
import { AlertTriangle, Bell, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import { fetchStudentProfileByUserId } from "../../services/AcademicRecordService";
import { fetchNotificationsForUser, type WorkflowNotification } from "../../services/NotificationService";
import { getParentProfileByUserId } from "../../services/ParentService";

export default function NotificationsPage() {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user || !role) return;
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const studentIds =
          role === "parent"
            ? (await getParentProfileByUserId(user.uid))?.studentIds || []
            : role === "student"
              ? [(await fetchStudentProfileByUserId(user.uid))?.studentId || ""]
              : [];
        setNotifications(await fetchNotificationsForUser({ userId: user.uid, role, studentIds }));
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load notifications.");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, [role, user]);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-semibold text-slate-950">Notifications</h1><p className="mt-1 text-sm text-slate-600">Active workflow alerts and school updates for your role.</p></div>
      {error && <p className="border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <section className="divide-y border bg-white">
        {loading && <p className="p-6 text-center text-sm text-slate-500">Loading notifications...</p>}
        {!loading && notifications.map((item) => <article key={item.id} className="flex items-start gap-3 p-4"><span className="mt-0.5 text-slate-600">{item.category === "alert" ? <AlertTriangle size={18} /> : item.category === "info" ? <Info size={18} /> : <Bell size={18} />}</span><div className="min-w-0 flex-1"><h2 className="text-sm font-medium text-slate-950">{item.title}</h2><p className="mt-1 text-sm text-slate-600">{item.message}</p>{item.route && <Link className="mt-2 inline-block text-sm font-medium text-blue-700 hover:text-blue-900" to={item.route}>Open workflow</Link>}</div></article>)}
        {!loading && !notifications.length && <p className="p-6 text-center text-sm text-slate-500">No active notifications.</p>}
      </section>
    </div>
  );
}
