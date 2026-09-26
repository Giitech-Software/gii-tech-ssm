import { useEffect, useState } from "react";
import { CalendarPlus, Megaphone, Pencil, Plus, Send, Trash2, X } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { logActivity } from "../../utils/firestoreHelpers";
import {
  createAnnouncement,
  createCalendarEvent,
  deleteAnnouncement,
  deleteCalendarEvent,
  fetchAnnouncements,
  fetchCalendarEvents,
  updateAnnouncement,
  updateCalendarEvent,
  type Audience,
  type CalendarEvent,
  type NewAnnouncement,
  type NewCalendarEvent,
  type SchoolAnnouncement,
} from "../../services/SchoolCommunicationService";

const emptyAnnouncement: NewAnnouncement = { title: "", message: "", audience: "all", category: "announcement", published: true, createdBy: "" };
const emptyEvent: NewCalendarEvent = { title: "", description: "", eventType: "academic", audience: "all", startDate: "", endDate: "", location: "", createdBy: "" };

export default function CommunicationsPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<"announcements" | "calendar">("announcements");
  const [announcements, setAnnouncements] = useState<SchoolAnnouncement[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [announcementForm, setAnnouncementForm] = useState<NewAnnouncement>(emptyAnnouncement);
  const [eventForm, setEventForm] = useState<NewCalendarEvent>(emptyEvent);
  const [editingAnnouncement, setEditingAnnouncement] = useState("");
  const [editingEvent, setEditingEvent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const loadData = async () => {
    setLoading(true);
    setError("");
    try {
      const [announcementRecords, calendarRecords] = await Promise.all([fetchAnnouncements(undefined, true), fetchCalendarEvents()]);
      setAnnouncements(announcementRecords);
      setEvents(calendarRecords);
    } catch (loadError) {
      console.error(loadError);
      setError("Unable to load communications data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, []);

  const saveAnnouncement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!announcementForm.title.trim() || !announcementForm.message.trim()) return;
    setSaving(true);
    try {
      const payload = { ...announcementForm, createdBy: user?.uid || announcementForm.createdBy };
      if (editingAnnouncement) {
        await updateAnnouncement(editingAnnouncement, payload);
        await logActivity(user?.uid || "", "update_announcement", { announcementId: editingAnnouncement, title: payload.title });
      } else {
        const created = await createAnnouncement(payload);
        await logActivity(user?.uid || "", "create_announcement", { announcementId: created.id, title: payload.title });
      }
      setAnnouncementForm(emptyAnnouncement);
      setEditingAnnouncement("");
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save the announcement.");
    } finally {
      setSaving(false);
    }
  };

  const removeAnnouncement = async (item: SchoolAnnouncement) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await deleteAnnouncement(item.id);
    await logActivity(user?.uid || "", "delete_announcement", { announcementId: item.id, title: item.title });
    await loadData();
  };

  const saveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!eventForm.title.trim() || !eventForm.startDate) return;
    setSaving(true);
    try {
      const payload = { ...eventForm, createdBy: user?.uid || eventForm.createdBy };
      if (editingEvent) {
        await updateCalendarEvent(editingEvent, payload);
        await logActivity(user?.uid || "", "update_calendar_event", { calendarEventId: editingEvent, title: payload.title });
      } else {
        const created = await createCalendarEvent(payload);
        await logActivity(user?.uid || "", "create_calendar_event", { calendarEventId: created.id, title: payload.title });
      }
      setEventForm(emptyEvent);
      setEditingEvent("");
      await loadData();
    } catch (saveError) {
      console.error(saveError);
      setError("Unable to save the calendar event.");
    } finally {
      setSaving(false);
    }
  };

  const removeEvent = async (item: CalendarEvent) => {
    if (!window.confirm(`Delete "${item.title}"?`)) return;
    await deleteCalendarEvent(item.id);
    await logActivity(user?.uid || "", "delete_calendar_event", { calendarEventId: item.id, title: item.title });
    await loadData();
  };

  return (
    <div className="space-y-5">
      <div><h1 className="text-2xl font-bold text-slate-900">Communications</h1><p className="mt-1 text-sm text-slate-600">Publish school notices and maintain the academic calendar.</p></div>
      <div className="flex border-b"><Tab active={tab === "announcements"} onClick={() => setTab("announcements")} icon={<Megaphone size={16} />} label="Announcements" /><Tab active={tab === "calendar"} onClick={() => setTab("calendar")} icon={<CalendarPlus size={16} />} label="Calendar" /></div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {tab === "announcements" ? (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <form onSubmit={saveAnnouncement} className="space-y-3 border bg-white p-4"><h2 className="font-semibold">{editingAnnouncement ? "Edit Announcement" : "New Announcement"}</h2><Field label="Title"><input required value={announcementForm.title} onChange={(event) => setAnnouncementForm({ ...announcementForm, title: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field><Field label="Message"><textarea required rows={5} value={announcementForm.message} onChange={(event) => setAnnouncementForm({ ...announcementForm, message: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Audience"><AudienceSelect value={announcementForm.audience} onChange={(audience) => setAnnouncementForm({ ...announcementForm, audience })} /></Field><Field label="Category"><select value={announcementForm.category} onChange={(event) => setAnnouncementForm({ ...announcementForm, category: event.target.value as NewAnnouncement["category"] })} className="w-full rounded-md border px-3 py-2"><option value="announcement">Announcement</option><option value="info">Information</option><option value="alert">Alert</option></select></Field></div><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={announcementForm.published} onChange={(event) => setAnnouncementForm({ ...announcementForm, published: event.target.checked })} /> Publish immediately</label><FormActions saving={saving} editing={!!editingAnnouncement} onCancel={() => { setAnnouncementForm(emptyAnnouncement); setEditingAnnouncement(""); }} /></form>
          <div className="space-y-3">{loading ? <Loading /> : announcements.map((item) => <article key={item.id} className="border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.title}</h2><Badge>{item.audience}</Badge><Badge>{item.published ? "published" : "draft"}</Badge></div><p className="mt-2 text-sm text-slate-700">{item.message}</p></div><RowActions onEdit={() => { setEditingAnnouncement(item.id); setAnnouncementForm({ title: item.title, message: item.message, audience: item.audience, category: item.category, published: item.published, createdBy: item.createdBy }); }} onDelete={() => removeAnnouncement(item)} /></div></article>)}</div>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[360px_1fr]">
          <form onSubmit={saveEvent} className="space-y-3 border bg-white p-4"><h2 className="font-semibold">{editingEvent ? "Edit Calendar Event" : "New Calendar Event"}</h2><Field label="Title"><input required value={eventForm.title} onChange={(event) => setEventForm({ ...eventForm, title: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field><Field label="Description"><textarea rows={3} value={eventForm.description} onChange={(event) => setEventForm({ ...eventForm, description: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field><div className="grid grid-cols-2 gap-3"><Field label="Start date"><input required type="date" value={eventForm.startDate} onChange={(event) => setEventForm({ ...eventForm, startDate: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field><Field label="End date"><input type="date" value={eventForm.endDate} onChange={(event) => setEventForm({ ...eventForm, endDate: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field></div><div className="grid grid-cols-2 gap-3"><Field label="Audience"><AudienceSelect value={eventForm.audience} onChange={(audience) => setEventForm({ ...eventForm, audience })} /></Field><Field label="Type"><select value={eventForm.eventType} onChange={(event) => setEventForm({ ...eventForm, eventType: event.target.value as NewCalendarEvent["eventType"] })} className="w-full rounded-md border px-3 py-2"><option value="academic">Academic</option><option value="exam">Exam</option><option value="holiday">Holiday</option><option value="meeting">Meeting</option><option value="activity">Activity</option></select></Field></div><Field label="Location"><input value={eventForm.location} onChange={(event) => setEventForm({ ...eventForm, location: event.target.value })} className="w-full rounded-md border px-3 py-2" /></Field><FormActions saving={saving} editing={!!editingEvent} onCancel={() => { setEventForm(emptyEvent); setEditingEvent(""); }} /></form>
          <div className="space-y-3">{loading ? <Loading /> : events.map((item) => <article key={item.id} className="border bg-white p-4"><div className="flex items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-slate-900">{item.title}</h2><Badge>{item.eventType}</Badge><Badge>{item.audience}</Badge></div><p className="mt-2 text-sm text-slate-600">{item.startDate}{item.endDate ? ` - ${item.endDate}` : ""}{item.location ? ` | ${item.location}` : ""}</p><p className="mt-2 text-sm text-slate-700">{item.description}</p></div><RowActions onEdit={() => { setEditingEvent(item.id); setEventForm({ title: item.title, description: item.description, eventType: item.eventType, audience: item.audience, startDate: item.startDate, endDate: item.endDate, location: item.location, createdBy: item.createdBy }); }} onDelete={() => removeEvent(item)} /></div></article>)}</div>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block space-y-1 text-sm font-medium text-slate-700"><span>{label}</span>{children}</label>; }
function AudienceSelect({ value, onChange }: { value: Audience; onChange: (value: Audience) => void }) { return <select value={value} onChange={(event) => onChange(event.target.value as Audience)} className="w-full rounded-md border px-3 py-2"><option value="all">Everyone</option><option value="admin">Admins</option><option value="teacher">Teachers</option><option value="student">Students</option><option value="parent">Parents</option></select>; }
function Badge({ children }: { children: React.ReactNode }) { return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs capitalize text-slate-600">{children}</span>; }
function Loading() { return <p className="border bg-white py-10 text-center text-sm text-slate-500">Loading...</p>; }
function Tab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) { return <button type="button" onClick={onClick} className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium ${active ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{icon}{label}</button>; }
function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) { return <div className="flex gap-1"><button title="Edit" onClick={onEdit} className="rounded-md p-2 text-primary hover:bg-primary"><Pencil size={16} /></button><button title="Delete" onClick={onDelete} className="rounded-md p-2 text-red-600 hover:bg-red-50"><Trash2 size={16} /></button></div>; }
function FormActions({ saving, editing, onCancel }: { saving: boolean; editing: boolean; onCancel: () => void }) { return <div className="flex gap-2"><button disabled={saving} className="flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm font-medium text-white disabled:opacity-60">{editing ? <Send size={15} /> : <Plus size={15} />}{saving ? "Saving..." : editing ? "Save Changes" : "Create"}</button>{editing && <button type="button" onClick={onCancel} className="flex items-center gap-1 rounded-md border px-3 py-2 text-sm"><X size={15} />Cancel</button>}</div>; }
