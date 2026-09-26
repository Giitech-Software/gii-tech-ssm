import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPin } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { fetchCalendarEvents, type CalendarEvent } from "../../services/SchoolCommunicationService";

const formatDate = (value?: string) => value ? new Date(`${value}T00:00:00`).toLocaleDateString(undefined, { dateStyle: "medium" }) : "-";

export default function CalendarPage() {
  const { role } = useAuth();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [type, setType] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadEvents = async () => {
      try {
        setEvents(await fetchCalendarEvents(role || undefined));
      } catch (loadError) {
        console.error(loadError);
        setError("Unable to load the academic calendar.");
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, [role]);

  const filtered = useMemo(() => events.filter((item) => !type || item.eventType === type), [events, type]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-bold text-slate-900">Academic Calendar</h1><p className="mt-1 text-sm text-slate-600">Term dates, exams, activities, and school events.</p></div><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-md border bg-white px-3 py-2 text-sm"><option value="">All event types</option><option value="academic">Academic</option><option value="exam">Exam</option><option value="holiday">Holiday</option><option value="meeting">Meeting</option><option value="activity">Activity</option></select></div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {!loading && filtered.map((item) => <article key={item.id} className="border bg-white p-4"><div className="flex items-start gap-3"><div className="rounded-md bg-primary p-2 text-primary"><CalendarDays size={18} /></div><div><p className="text-xs font-medium uppercase text-primary">{item.eventType}</p><h2 className="mt-1 font-semibold text-slate-900">{item.title}</h2><p className="mt-2 text-sm text-slate-600">{formatDate(item.startDate)}{item.endDate && item.endDate !== item.startDate ? ` - ${formatDate(item.endDate)}` : ""}</p>{item.location && <p className="mt-2 flex items-center gap-1 text-xs text-slate-500"><MapPin size={13} />{item.location}</p>}<p className="mt-3 text-sm text-slate-700">{item.description}</p></div></div></article>)}
      </div>
      {loading && <p className="py-10 text-center text-sm text-slate-500">Loading calendar...</p>}
      {!loading && !filtered.length && <p className="border bg-white py-10 text-center text-sm text-slate-500"><CalendarDays className="mx-auto mb-2" size={20} />No calendar events found.</p>}
    </div>
  );
}
