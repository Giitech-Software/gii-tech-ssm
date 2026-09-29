import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
export type MobileAiAlert = { id: string; month?: string; estimatedCost?: number; budget?: number; threshold?: number };
export async function fetchAiBudgetAlerts() { const snapshot = await getDocs(collection(db, "aiBudgetAlerts")); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MobileAiAlert)).sort((a, b) => b.id.localeCompare(a.id)); }
