import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";
const functions = getFunctions(app, "africa-south1");
export async function initiateMobileMoneyPayment(input: { studentId: string; amount: number; phone: string; provider: string }) { const callable = httpsCallable<typeof input, { intentId: string; status: string }>(functions, "initiateMobileMoneyPayment"); return (await callable(input)).data; }
