import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app, db } from "../firebaseConfig";
export type PaymentIntent = { id: string; userId: string; studentId: string; amount: number; currency: string; provider: string; phone: string; status: "pending" | "paid" | "failed" | "cancelled"; providerReference?: string; createdAt?: unknown };
export async function getPaymentIntents() { const snapshot = await getDocs(collection(db, "paymentIntents")); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as PaymentIntent)); }
export async function reconcilePaymentIntent(intentId: string, status: Exclude<PaymentIntent["status"], "pending">, providerReference: string) { const call = httpsCallable(getFunctions(app), "reconcilePaymentIntent"); return call({ intentId, status, providerReference }); }
