import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../firebaseConfig";
const functions = getFunctions(app, "africa-south1");
export type PaymentIntent = { id: string; studentId?: string; amount?: number; provider?: string; status?: string; reference?: string };
export async function fetchPaymentIntents() { const snapshot = await getDocs(query(collection(db, "paymentIntents"), orderBy("createdAt", "desc"))); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PaymentIntent)); }
export async function reconcilePaymentIntent(intentId: string, status: "paid" | "failed", reference?: string) { const callable = httpsCallable(functions, "reconcilePaymentIntent"); await callable({ intentId, status, reference }); }
