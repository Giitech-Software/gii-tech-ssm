import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
export type MobileAiUsage = { id: string; generationCount?: number; estimatedCost?: number; inputTokens?: number; outputTokens?: number };
export async function fetchMonthlyAiUsage() { const snapshot = await getDocs(collection(db, "aiUsageMonths")); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MobileAiUsage)).sort((a, b) => b.id.localeCompare(a.id)); }
