import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, Info, Megaphone, Search } from "lucide-react";
import { Timestamp } from "firebase/firestore";
import { useAuth } from "../../contexts/AuthContext";
import { fetchAnnouncements, type SchoolAnnouncement } from "../../services/SchoolCommunicationService";

const iconFor = (category: SchoolAnnouncement["category"]) => {
  if (category === "alert") return <AlertTriangle className="text-red-600" size={19} />;
  if (category === "info") return <Info className="text-blue-600" size={19} />;
  return <Megaphone className="text-primary" size={19} />;
};

const formatDate = (value?: Timestamp | string) => {
  if (!value) return "-";
  const date = value instanceof Timestamp ? value.toDate() : new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

export default function AnnouncementsPage() {
  const { role } = useAuth();
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadAnnouncements = async () => {
      try {
        setAnnouncements(await fetchAnnouncements(role || undefined));
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load announcements.");
      } finally {
        setLoading(false);
      }
    };
    loadAnnouncements();
  }, [role]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return announcements.filter((item) => !term || `${item.title} ${item.message}`.toLowerCase().includes(term));
  }, [announcements, search]);

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-900">Announcements</h1><p className="mt-1 text-sm text-slate-600">School notices and important updates.</p></div>
      <label className="relative block max-w-md"><Search className="absolute left-3 top-2.5 text-slate-400" size={17} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search announcements" className="w-full rounded-md border py-2 pl-9 pr-3 text-sm" /></label>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="space-y-3">
        {!loading && filtered.map((item) => <article key={item.id} className="border bg-white p-4"><div className="flex gap-3"><div className="rounded-md bg-slate-50 p-2">{iconFor(item.category)}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.title}</h2><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{item.audience}</span></div><p className="mt-2 whitespace-pre-line text-sm text-slate-700">{item.message}</p><p className="mt-3 text-xs text-slate-400">{formatDate(item.createdAt)}</p></div></div></article>)}
        {loading && <p className="py-10 text-center text-sm text-slate-500">Loading announcements...</p>}
        {!loading && !filtered.length && <p className="border bg-white py-10 text-center text-sm text-slate-500"><Bell className="mx-auto mb-2" size={20} />No announcements found.</p>}
      </div>
    </div>
  );
}
