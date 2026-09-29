import { useCallback, useEffect, useState } from "react";
import { Linking, Pressable, Text, View } from "react-native";
import { StudentPageShell } from "../../src/components/StudentPageShell";
import { useAuth } from "../../src/contexts/AuthContext";
import { fetchStudentProfile } from "../../src/services/studentDetailService";
import { fetchStudentMaterials, type StudentMaterial } from "../../src/services/studentMaterialsService";
import { readCachedData, writeCachedData } from "../../src/services/offlineStore";

export default function StudentMaterialsPage() {
  const { user } = useAuth();
  const [materials, setMaterials] = useState<StudentMaterial[]>([]);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!user) return;
    try {
      const profile = await fetchStudentProfile(user.uid);
      const result = await fetchStudentMaterials(user.uid, profile.data.classId);
      setMaterials(result.data);
      setOffline(result.source === "cache");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to load learning materials."); }
  }, [user]);
  useEffect(() => { void load(); if (user) void readCachedData<string[]>("student-material-bookmarks", user.uid, []).then(setBookmarks); }, [load, user]);
  const toggle = async (id: string) => { if (!user) return; const next = bookmarks.includes(id) ? bookmarks.filter(item => item !== id) : [...bookmarks, id]; setBookmarks(next); await writeCachedData("student-material-bookmarks", user.uid, next); };
  return <StudentPageShell title="Learning materials" subtitle="Access class resources and keep your important materials bookmarked.">
    {offline && <View className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4"><Text className="font-bold text-amber-800">Offline materials</Text><Text className="mt-1 text-sm text-amber-700">Showing the last cached class resources.</Text></View>}
    {error && <Text className="mt-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</Text>}
    <View className="mt-5 gap-3">{materials.map(item => <View key={item.id} className="rounded-2xl border border-slate-300 bg-white p-5 shadow-sm"><View className="flex-row items-start justify-between gap-3"><View className="flex-1"><Text className="text-lg font-bold text-slate-900">{item.title}</Text><Text className="mt-1 text-xs font-semibold uppercase tracking-wide text-primary">{item.subject || "Class resource"}</Text><Text className="mt-2 text-sm leading-5 text-slate-600">{item.description || item.fileName || "Open this learning material."}</Text></View><Pressable className="rounded-full border border-primary bg-primary px-3 py-2" onPress={() => void toggle(item.id)}><Text className="text-xl">{bookmarks.includes(item.id) ? "★" : "☆"}</Text></Pressable></View><Pressable onPress={() => void Linking.openURL(item.fileUrl)} className="mt-4 rounded-xl bg-primary px-4 py-3"><Text className="text-center font-bold text-white">Open material</Text></Pressable></View>)}{!materials.length && <Text className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-slate-500">No materials available for your class.</Text>}</View>
  </StudentPageShell>;
}
