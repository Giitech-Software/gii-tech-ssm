import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { LoadingState } from "../../components/LoadingState";
import { useAuth } from "../../contexts/AuthContext";
import { getMaterialsForClass, type LearningMaterial } from "../../services/LearningMaterialService";
import { cacheLearningMaterials, getCachedLearningMaterials, getMaterialBookmarks, toggleMaterialBookmark } from "../../services/LearningMaterialOfflineService";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { TENANT_ID } from "../../config/tenant";

export default function LearningMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<LearningMaterial[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>(getMaterialBookmarks());
  const [offline, setOffline] = useState(() => typeof navigator !== "undefined" && !navigator.onLine);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    const load = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const studentSnapshot = await getDocs(query(
          collection(db, "students"),
          where("tenantId", "==", TENANT_ID),
          where("userId", "==", user.uid),
        ));
        const classId = studentSnapshot.docs[0]?.data().classId;
        if (classId) {
          const fresh = await getMaterialsForClass(classId);
          setMaterials(fresh);
          await cacheLearningMaterials(fresh);
        }
        setOffline(typeof navigator !== "undefined" && !navigator.onLine);
      } catch {
        setOffline(typeof navigator !== "undefined" && !navigator.onLine);
        setMaterials(await getCachedLearningMaterials());
      } finally {
        setLoading(false);
      }
    };
    void load();
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wider text-primary">Learning management</p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">Learning materials</h1>
        <p className="mt-2 text-sm text-slate-500">Access notes and resources shared with your class.</p>
        {offline && <p className="mt-2 text-xs font-semibold text-amber-700">You’re viewing the last saved materials. New updates will appear when you’re connected.</p>}
      </div>
      {loading ? <LoadingState label="Loading materials" /> : <div className="grid gap-4 md:grid-cols-2">
        {materials.map(item => <article key={item.id} className={`rounded-xl border bg-white p-5 shadow-sm ${bookmarks.includes(item.id) ? "border-primary" : "border-slate-200"}`}>
          <div className="flex items-start justify-between"><FileText className="text-primary" size={22} /><button onClick={() => setBookmarks(toggleMaterialBookmark(item.id))} className="text-xs font-semibold text-primary">{bookmarks.includes(item.id) ? "★ Saved" : "☆ Bookmark"}</button></div>
          <h2 className="mt-4 font-bold text-slate-900">{item.title}</h2>
          <p className="mt-1 text-xs text-slate-500">{item.subject || "Resource"} · {item.fileName}</p>
          {item.description && <p className="mt-3 text-sm leading-6 text-slate-600">{item.description}</p>}
          <a href={item.fileUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-primary"><Download size={16} />Open resource</a>
        </article>)}
        {!materials.length && <p className="text-sm text-slate-500">No materials have been shared with your class yet.</p>}
      </div>}
    </div>
  );
}
