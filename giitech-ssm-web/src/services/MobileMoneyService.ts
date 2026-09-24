import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig";

const functions = getFunctions(app);
export type MobileMoneyProvider = "mtn-momo" | "telecel-cash" | "airteltigo-money";
export async function createMobileMoneyIntent(data: { amount: number; studentId: string; provider: MobileMoneyProvider; phone: string }) { const call = httpsCallable<typeof data, { intentId: string; status: string; message: string }>(functions, "initiateMobileMoneyPayment"); return (await call(data)).data; }
