import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { readCachedData, writeCachedData } from "./offlineStore";

export type StudentMaterial = { id: string; title: string; description?: string; subject?: string; fileUrl: string; fileName?: string };
const SCOPE = "student-materials";
export async function fetchStudentMaterials(userId: string, classId: string) { const cached = await readCachedData<StudentMaterial[]>(SCOPE, userId, []); try { const snapshot = await getDocs(query(collection(db, "learningMaterials"), where("classId", "==", classId))); const data = snapshot.docs.map(item => ({ id: item.id, ...item.data() } as StudentMaterial)); await writeCachedData(SCOPE, userId, data); return { data, source: "live" as const }; } catch { return { data: cached, source: "cache" as const }; } }
