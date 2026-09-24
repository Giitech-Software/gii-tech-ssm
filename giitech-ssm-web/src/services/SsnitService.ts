import { doc, getDoc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type SsnitRemittanceStatus = "prepared" | "submitted" | "paid" | "confirmed";
export async function fetchSsnitRemittance(period: string) { const snapshot = await getDoc(doc(db, "ssnitRemittances", period)); return (snapshot.data()?.status || "prepared") as SsnitRemittanceStatus; }
export async function updateSsnitRemittance(period: string, status: SsnitRemittanceStatus, actorId: string) { await setDoc(doc(db, "ssnitRemittances", period), { period, status, updatedBy: actorId, updatedAt: serverTimestamp() }, { merge: true }); }
