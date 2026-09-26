import { useEffect, useState } from "react";
import { Pencil, Plus, Save, Trash2, X } from "lucide-react";
import {
  addAcademicTerm, deleteAcademicTerm, deleteAcademicYear, getAcademicTerms, getAcademicYears,
  saveAcademicYear, updateAcademicTerm, type AcademicTerm, type AcademicYear,
} from "../../services/AcademicYearService";

const emptyYear = { name: "", startDate: "", endDate: "", active: false };
const emptyTerm = { name: "", startDate: "", endDate: "" };
const inputClass = "input";

export default function AcademicYearsPage() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [yearForm, setYearForm] = useState(emptyYear);
  const [termForm, setTermForm] = useState(emptyTerm);
  const [editingYear, setEditingYear] = useState<string | undefined>();
  const [editingTerm, setEditingTerm] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async (yearId?: string) => {
    setLoading(true); setError("");
    try {
      const result = await getAcademicYears();
      setYears(result);
      const nextId = yearId || selectedId || result.find((item) => item.active)?.id || result[0]?.id || "";
      setSelectedId(nextId);
      setTerms(nextId ? await getAcademicTerms(nextId) : []);
    } catch (loadError) { setError(loadError instanceof Error ? loadError.message : "Unable to load academic years."); }
    finally { setLoading(false); }
  };
  useEffect(() => { void load(); }, []);

  const submitYear = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setMessage(""); setError("");
    try { await saveAcademicYear(yearForm, editingYear); setYearForm(emptyYear); setEditingYear(undefined); setMessage("Academic year saved."); await load(editingYear); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save academic year."); }
    finally { setSaving(false); }
  };
  const submitTerm = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selectedId) return setError("Create or select an academic year first.");
    setSaving(true); setMessage(""); setError("");
    try { const value = { ...termForm, academicYearId: selectedId }; editingTerm ? await updateAcademicTerm(editingTerm, value) : await addAcademicTerm(value); setTermForm(emptyTerm); setEditingTerm(undefined); setMessage("Term saved."); setTerms(await getAcademicTerms(selectedId)); }
    catch (saveError) { setError(saveError instanceof Error ? saveError.message : "Unable to save term."); }
    finally { setSaving(false); }
  };
  const selectYear = async (id: string) => { setSelectedId(id); setTerms(await getAcademicTerms(id)); setEditingTerm(undefined); setTermForm(emptyTerm); };
  const removeYear = async (id: string) => { if (!window.confirm("Delete this academic year? Its terms will also become unavailable.")) return; await deleteAcademicYear(id); await load(selectedId === id ? undefined : selectedId); };
  const removeTerm = async (id: string) => { if (!window.confirm("Delete this term?")) return; await deleteAcademicTerm(id); setTerms(await getAcademicTerms(selectedId)); };

  return <div className="mx-auto max-w-7xl space-y-6">
    <div><p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">Academic structure</p><h1 className="mt-1 text-3xl font-bold text-slate-900">Academic years and terms</h1><p className="mt-2 text-sm text-slate-500">Define the school calendar used by classes, attendance, assessments, fees, and reports.</p></div>
    {!!message && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">{message}</div>}
    {!!error && <div className="rounded-lg bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex items-center justify-between"><div><h2 className="font-bold text-slate-900">Academic years</h2><p className="text-xs text-slate-500">One active year can drive current workflows.</p></div><Plus size={18} className="text-indigo-600" /></div>
        <form onSubmit={submitYear} className="space-y-3 rounded-lg bg-slate-50 p-4"><label className="block text-xs font-semibold text-slate-600">Year label<input className={inputClass} placeholder="2025/2026" value={yearForm.name} onChange={e => setYearForm({ ...yearForm, name: e.target.value })} /></label><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold text-slate-600">Start date<input type="date" className={inputClass} value={yearForm.startDate} onChange={e => setYearForm({ ...yearForm, startDate: e.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">End date<input type="date" className={inputClass} value={yearForm.endDate} onChange={e => setYearForm({ ...yearForm, endDate: e.target.value })} /></label></div><label className="flex items-center gap-2 text-sm text-slate-700"><input type="checkbox" checked={yearForm.active} onChange={e => setYearForm({ ...yearForm, active: e.target.checked })} /> Set as active year</label><div className="flex gap-2"><button disabled={saving} className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"><Save size={16} />{editingYear ? "Save changes" : "Add year"}</button>{editingYear && <button type="button" onClick={() => { setEditingYear(undefined); setYearForm(emptyYear); }} className="rounded-lg px-3 py-2 text-sm text-slate-600 hover:bg-white"><X size={16} /></button>}</div></form>
        <div className="mt-4 space-y-2">{loading ? <p className="text-sm text-slate-500">Loading academic years...</p> : years.map(year => <div key={year.id} className={`rounded-lg border p-3 ${selectedId === year.id ? "border-indigo-300 bg-indigo-50/60" : "border-slate-200"}`}><button onClick={() => void selectYear(year.id)} className="w-full text-left"><div className="flex items-center justify-between"><span className="font-semibold text-slate-900">{year.name}</span>{year.active && <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-700">Active</span>}</div><p className="mt-1 text-xs text-slate-500">{year.startDate} to {year.endDate}</p></button><div className="mt-2 flex gap-3"><button onClick={() => { setEditingYear(year.id); setYearForm({ name: year.name, startDate: year.startDate, endDate: year.endDate, active: year.active }); }} className="flex items-center gap-1 text-xs font-semibold text-indigo-700"><Pencil size={13} /> Edit</button><button onClick={() => void removeYear(year.id)} className="flex items-center gap-1 text-xs font-semibold text-red-600"><Trash2 size={13} /> Delete</button></div></div>)}{!loading && !years.length && <p className="rounded-lg border border-dashed p-5 text-center text-sm text-slate-500">No academic years configured.</p>}</div>
      </section>
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-bold text-slate-900">Terms {years.find(year => year.id === selectedId) ? `for ${years.find(year => year.id === selectedId)?.name}` : ""}</h2><p className="text-xs text-slate-500">Create the teaching periods within the selected academic year.</p><form onSubmit={submitTerm} className="mt-4 grid gap-3 rounded-lg bg-slate-50 p-4 md:grid-cols-[1fr_1fr_1fr_auto] md:items-end"><label className="block text-xs font-semibold text-slate-600">Term name<input className={inputClass} placeholder="Term 1" value={termForm.name} onChange={e => setTermForm({ ...termForm, name: e.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">Start date<input type="date" className={inputClass} value={termForm.startDate} onChange={e => setTermForm({ ...termForm, startDate: e.target.value })} /></label><label className="block text-xs font-semibold text-slate-600">End date<input type="date" className={inputClass} value={termForm.endDate} onChange={e => setTermForm({ ...termForm, endDate: e.target.value })} /></label><button disabled={saving || !selectedId} className="rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">{editingTerm ? "Save" : "Add"}</button></form><div className="mt-4 overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-3 py-3">Term</th><th className="px-3 py-3">Dates</th><th className="px-3 py-3 text-right">Actions</th></tr></thead><tbody>{terms.map(term => <tr key={term.id} className="border-b border-slate-100"><td className="px-3 py-3 font-semibold text-slate-800">{term.name}</td><td className="px-3 py-3 text-slate-500">{term.startDate} to {term.endDate}</td><td className="px-3 py-3 text-right"><button onClick={() => { setEditingTerm(term.id); setTermForm({ name: term.name, startDate: term.startDate, endDate: term.endDate }); }} className="mr-3 text-indigo-700"><Pencil size={15} /></button><button onClick={() => void removeTerm(term.id)} className="text-red-600"><Trash2 size={15} /></button></td></tr>)}</tbody></table>{!terms.length && <p className="p-8 text-center text-sm text-slate-500">Select an academic year to view its terms.</p>}</div></section>
    </div>
  </div>;
}
