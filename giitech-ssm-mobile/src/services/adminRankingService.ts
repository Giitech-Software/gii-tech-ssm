import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";

export type MobileRanking = { studentId: string; studentName: string; classId?: string; average: number; position: number };

export async function fetchAdminRankings() {
  const [studentsSnapshot, gradesSnapshot] = await Promise.all([
    getDocs(query(collection(db, "students"), where("tenantId", "==", TENANT_ID))),
    getDocs(query(collection(db, "grades"), where("tenantId", "==", TENANT_ID))),
  ]);
  const names = new Map<string, { name: string; classId?: string }>();
  studentsSnapshot.docs.forEach(item => { const data = item.data(); names.set(item.id, { name: String(data.displayName || data.studentName || item.id), classId: data.classId }); });
  const totals = new Map<string, { sum: number; count: number }>();
  gradesSnapshot.docs.forEach(item => { const data = item.data(); const id = String(data.studentId || ""); const mark = Number(data.percentage ?? data.score); if (!id || !Number.isFinite(mark)) return; const current = totals.get(id) || { sum: 0, count: 0 }; totals.set(id, { sum: current.sum + mark, count: current.count + 1 }); });
  const ranked = [...totals.entries()].map(([studentId, value]) => ({ studentId, studentName: names.get(studentId)?.name || studentId, classId: names.get(studentId)?.classId, average: Math.round(value.sum / value.count) })).sort((a, b) => b.average - a.average);
  let previous = -1;
  return ranked.map((item, index) => { const position = item.average === previous ? index : index + 1; previous = item.average; return { ...item, position }; });
}
