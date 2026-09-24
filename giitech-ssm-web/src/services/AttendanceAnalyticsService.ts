import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type AttendanceAnalyticsRecord = { id: string; studentId: string; studentName: string; classId: string; date: string; status?: string; present?: boolean; method?: string };

export async function getAttendanceAnalyticsRecords() {
  const snapshot = await getDocs(collection(db, "attendance"));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as AttendanceAnalyticsRecord));
}
