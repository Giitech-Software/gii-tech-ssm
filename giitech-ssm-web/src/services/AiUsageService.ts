import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type AiSettings = { dailyGenerationLimit: number; inputCostPerMillion: number; outputCostPerMillion: number; monthlyBudget: number };
export const defaultAiSettings: AiSettings = { dailyGenerationLimit: 100, inputCostPerMillion: 0, outputCostPerMillion: 0, monthlyBudget: 0 };
export async function getAiSettings(): Promise<AiSettings> { const snapshot = await getDoc(doc(db, "aiSettings", "global")); return { ...defaultAiSettings, ...(snapshot.data() as Partial<AiSettings> | undefined) }; }
export async function saveAiSettings(settings: AiSettings) { await setDoc(doc(db, "aiSettings", "global"), { ...settings, updatedAt: serverTimestamp() }, { merge: true }); }
