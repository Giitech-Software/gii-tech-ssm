import { createHmac, timingSafeEqual } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onRequest } from "firebase-functions/v2/https";

export type MobileMoneyProvider = "mtn-momo" | "telecel-cash" | "airteltigo-money";
type PaymentIntentStatus = "pending" | "paid" | "failed" | "cancelled";

async function createLedgerPayment(intentId: string) {
  const db = getFirestore(); const intentRef = db.collection("paymentIntents").doc(intentId); const intentSnapshot = await intentRef.get(); if (!intentSnapshot.exists) throw new Error("Payment intent not found"); const intent = intentSnapshot.data() || {};
  if (intent.feePaymentId) return intent.feePaymentId;
  const studentSnapshot = await db.collection("students").doc(String(intent.studentId)).get(); const student = studentSnapshot.data() || {};
  const paymentRef = db.collection("feePayments").doc(`gateway_${intentId}`); const receiptNumber = `RCP-${intentId.slice(0, 10).toUpperCase()}`;
  await paymentRef.set({ receiptNumber, studentId: String(intent.studentId), studentName: String(student.displayName || student.studentName || intent.studentId), amount: Number(intent.amount), paymentMethod: "mobile-money", reference: String(intent.providerReference || intentId), notes: `Gateway payment via ${String(intent.provider || "mobile money")}`, academicYear: String(intent.academicYear || "All academic years"), term: String(intent.term || "All terms"), receivedBy: "payment-gateway", gatewayIntentId: intentId, createdAt: FieldValue.serverTimestamp() });
  await intentRef.update({ feePaymentId: paymentRef.id, receiptNumber, updatedAt: FieldValue.serverTimestamp() }); return paymentRef.id;
}

function signatureMatches(payload: string, signature: string, secret: string) { const expected = createHmac("sha256", secret).update(payload).digest("hex"); const left = Buffer.from(expected); const right = Buffer.from(signature); return left.length === right.length && timingSafeEqual(left, right); }

export const initiateMobileMoneyPayment = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in is required.");
  const amount = Number(request.data?.amount); const studentId = String(request.data?.studentId || ""); const provider = String(request.data?.provider || "") as MobileMoneyProvider; const phone = String(request.data?.phone || "");
  if (!Number.isFinite(amount) || amount <= 0 || !studentId || !phone || !["mtn-momo", "telecel-cash", "airteltigo-money"].includes(provider)) throw new HttpsError("invalid-argument", "Amount, student, phone, and a supported provider are required.");
  const db = getFirestore(); const intentRef = db.collection("paymentIntents").doc();
  await intentRef.set({ userId: request.auth.uid, studentId, amount, currency: "GHS", provider, phone, status: "pending" as PaymentIntentStatus, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
  return { intentId: intentRef.id, status: "pending", message: "Payment intent created. Provider initiation is awaiting gateway credentials." };
});

export const mobileMoneyWebhook = onRequest(async (request, response) => {
  if (request.method !== "POST") { response.status(405).send("Method not allowed"); return; }
  const secret = process.env.MOBILE_MONEY_WEBHOOK_SECRET;
  const signature = String(request.header("x-giitech-signature") || "");
  const rawBody = typeof request.rawBody?.toString === "function" ? request.rawBody.toString("utf8") : JSON.stringify(request.body || {});
  if (!secret || !signature || !signatureMatches(rawBody, signature, secret)) { response.status(401).send("Invalid signature"); return; }
  const intentId = String(request.body?.intentId || ""); const status = String(request.body?.status || "") as PaymentIntentStatus; const providerReference = String(request.body?.providerReference || "");
  if (!intentId || !["paid", "failed", "cancelled"].includes(status)) { response.status(400).send("Invalid payment callback"); return; }
  const db = getFirestore(); const intentRef = db.collection("paymentIntents").doc(intentId); const intent = await intentRef.get(); if (!intent.exists) { response.status(404).send("Payment intent not found"); return; }
  await intentRef.update({ status, providerReference, updatedAt: FieldValue.serverTimestamp(), ...(status === "paid" ? { paidAt: FieldValue.serverTimestamp() } : {}) });
  if (status === "paid") await createLedgerPayment(intentId);
  response.status(200).json({ received: true });
});

export const reconcilePaymentIntent = onCall(async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in is required.");
  const profile = await getFirestore().collection("users").doc(request.auth.uid).get();
  if (!["admin", "superadmin"].includes(String(profile.data()?.role || "").toLowerCase())) throw new HttpsError("permission-denied", "Administrator access is required.");
  const intentId = String(request.data?.intentId || ""); const status = String(request.data?.status || "") as PaymentIntentStatus; const providerReference = String(request.data?.providerReference || "");
  if (!intentId || !["paid", "failed", "cancelled"].includes(status)) throw new HttpsError("invalid-argument", "A valid intent and final status are required.");
  await getFirestore().collection("paymentIntents").doc(intentId).update({ status, providerReference, reconciledBy: request.auth.uid, reconciledAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp(), ...(status === "paid" ? { paidAt: FieldValue.serverTimestamp() } : {}) });
  if (status === "paid") await createLedgerPayment(intentId);
  return { status, intentId };
});
