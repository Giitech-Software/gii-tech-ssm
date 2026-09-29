import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
export type MobileAiAudit = { id: string; assignmentName?: string; studentName?: string; aiSuggestion?: { score: number; feedback: string; status?: string; model?: string }; aiApprovedBy?: string; aiRejectedBy?: string };
export async function fetchAiAudit() { const snapshot = await getDocs(collection(db, "submissions")); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as MobileAiAudit)).filter(item => !!item.aiSuggestion); }
