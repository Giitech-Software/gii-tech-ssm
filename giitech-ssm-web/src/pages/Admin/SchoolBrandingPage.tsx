import { useEffect, useState } from "react";
import { doc, getDoc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ImagePlus } from "lucide-react";
import { db, storage } from "../../firebaseConfig";
import { useAuth } from "../../contexts/AuthContext";

export default function SchoolBrandingPage() {
  const { tenantId } = useAuth();
  const [logoUrl, setLogoUrl] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => { if (!tenantId) return; void getDoc(doc(db, "tenants", tenantId)).then((snapshot) => { const data = snapshot.data() || {}; setSchoolName(String(data.schoolName || "")); setLogoUrl(String(data.logoUrl || "")); }); }, [tenantId]);

  const uploadLogo = async (file: File) => {
    if (!tenantId) return;
    if (!file.type.startsWith("image/")) return setError("Choose an image file.");
    if (file.size > 2 * 1024 * 1024) return setError("Choose an image smaller than 2 MB.");
    setSaving(true); setError(""); setMessage("");
    try {
      const logoRef = ref(storage, `tenants/${tenantId}/branding/logo`);
      await uploadBytes(logoRef, file, { contentType: file.type });
      const url = await getDownloadURL(logoRef);
      await updateDoc(doc(db, "tenants", tenantId), { logoUrl: url, logoStoragePath: logoRef.fullPath, updatedAt: serverTimestamp() });
      setLogoUrl(url); setMessage("School logo updated. Users will see it after refreshing the app.");
    } catch (value) { const code = String((value as { code?: string })?.code || ""); setError(code === "storage/unauthorized" || code === "permission-denied" ? "You do not have permission to update this school logo. Contact your Tenant Administrator." : code === "storage/unknown" ? "School logo storage is not ready yet. Ask the platform administrator to finish Firebase Storage setup." : value instanceof Error ? value.message : "Unable to upload the school logo. Please try again."); }
    finally { setSaving(false); }
  };

  return <main className="mx-auto max-w-3xl space-y-6"><header><p className="eyebrow">School settings</p><h1 className="text-3xl font-black text-dark">School branding</h1><p className="mt-2 text-sm text-slate-500">Upload the logo that identifies {schoolName || "your school"} for all users.</p></header>{message && <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-700">{message}</p>}{error && <p className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<section className="surface p-6"><div className="flex flex-wrap items-center gap-6"><div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">{logoUrl ? <img src={logoUrl} alt={`${schoolName} logo`} className="h-full w-full object-contain" /> : <ImagePlus className="text-slate-400" size={32} />}</div><div><h2 className="font-black text-dark">School logo</h2><p className="mt-1 text-sm text-slate-500">PNG, JPG, or WEBP. Maximum size: 2 MB.</p><label className="mt-4 inline-flex cursor-pointer rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white hover:opacity-90">{saving ? "Uploading..." : logoUrl ? "Replace logo" : "Upload logo"}<input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" disabled={saving} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadLogo(file); event.currentTarget.value = ""; }} /></label></div></div></section></main>;
}
