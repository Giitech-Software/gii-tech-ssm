import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
export type MobileAiSettings = { dailyGenerationLimit: number; inputCostPerMillion: number; outputCostPerMillion: number; monthlyBudget: number };
export const defaultMobileAiSettings: MobileAiSettings = { dailyGenerationLimit: 100, inputCostPerMillion: 0, outputCostPerMillion: 0, monthlyBudget: 0 };
export async function fetchAiSettings() { const snapshot = await getDoc(doc(db, "aiSettings", "global")); return { ...defaultMobileAiSettings, ...(snapshot.data() as Partial<MobileAiSettings> | undefined) }; }
export async function saveAiSettings(settings: MobileAiSettings) { await setDoc(doc(db, "aiSettings", "global"), { ...settings, updatedAt: serverTimestamp() }, { merge: true }); }
