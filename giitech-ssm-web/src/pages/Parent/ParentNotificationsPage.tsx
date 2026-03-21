import { useEffect, useState } from "react";
import { db } from "../../firebaseConfig";
import { useAuth } from "../../contexts/AuthContext";
import {
  collection,
  query,
  where,
  orderBy,
  getDocs,
  Timestamp,
} from "firebase/firestore";
import { exportToCSV, exportToPDF } from "../Admin/reports/utils/reportExports";
import {
  Bell,
  FileDown,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";

interface Notification {
  id: string;
  title: string;
  message: string;
  category: "announcement" | "alert" | "info";
  studentId?: string;
  createdAt: Timestamp | string;
  read?: boolean;
}

export default function ParentNotificationsPage() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      setLoading(true);
      try {
        // Fetch parent document to find their linked studentIds
        const parentRef = collection(db, "parents");
        const parentQuery = query(parentRef, where("__name__", "==", user.uid));
        const parentSnap = await getDocs(parentQuery);

        if (!parentSnap.empty) {
          const parentData = parentSnap.docs[0].data();
          const studentIds: string[] = parentData.studentIds || [];

          // Fetch notifications addressed to those students or global announcements
          const notifRef = collection(db, "notifications");
          const notifQuery = query(
            notifRef,
            where("target", "in", ["all", ...studentIds]),
            orderBy("createdAt", "desc")
          );
          const notifSnap = await getDocs(notifQuery);
          const notifList = notifSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
          })) as Notification[];
          setNotifications(notifList);
        }
      } catch (err) {
        console.error("Error fetching notifications:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotifications();
  }, [user]);

  if (loading)
    return (
      <div className="flex justify-center items-center h-screen text-gray-500">
        Loading notifications...
      </div>
    );

  const handleExportCSV = () => {
    exportToCSV(notifications, "ParentNotifications");
  };

  const handleExportPDF = () => {
    exportToPDF(notifications, "ParentNotifications");
  };

  const getIcon = (category: string) => {
    switch (category) {
      case "announcement":
        return <Info className="text-blue-600" size={22} />;
      case "alert":
        return <AlertTriangle className="text-red-600" size={22} />;
      default:
        return <Bell className="text-yellow-600" size={22} />;
    }
  };

  const formatDate = (date: any) => {
    try {
      if (date instanceof Timestamp) return date.toDate().toLocaleString();
      if (typeof date === "string") return new Date(date).toLocaleString();
      return "Unknown date";
    } catch {
      return "Invalid date";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Bell className="text-yellow-600" /> Notifications
          </h1>
          <p className="text-gray-600 mt-1">
            Stay up to date with announcements and student updates.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition"
          >
            <FileDown size={18} /> CSV
          </button>
          <button
            onClick={handleExportPDF}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition"
          >
            <FileText size={18} /> PDF
          </button>
        </div>
      </div>

      {/* Notification List */}
      <div className="bg-white shadow rounded-2xl p-6">
        {notifications.length ? (
          <ul className="divide-y divide-gray-200">
            {notifications.map((n) => (
              <li
                key={n.id}
                className="py-4 flex items-start justify-between hover:bg-gray-50 rounded-lg px-3 transition"
              >
                <div className="flex items-start gap-4">
                  <div className="p-2 bg-gray-100 rounded-xl">
                    {getIcon(n.category)}
                  </div>
                  <div>
                    <h2 className="font-semibold text-gray-800 flex items-center gap-2">
                      {n.title}
                      {n.read ? (
                        <CheckCircle2
                          size={16}
                          className="text-green-500 inline-block"
                        />
                      ) : null}
                    </h2>
                    <p className="text-gray-600 mt-1">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {formatDate(n.createdAt)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 italic text-center py-10">
            No notifications found.
          </p>
        )}
      </div>
    </div>
  );
}
