import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "africa-south1");
export type SignupRole = "parent" | "teacher" | "student" | "staff";
export type SignupRequest = { id: string; role: SignupRole; displayName: string; phone?: string; email?: string; extra?: Record<string, unknown>; status: string; createdAt?: unknown };
export type SignupOptions = { departments: { id: string; name: string }[]; subjects: { id: string; name: string }[]; classes: { id: string; name: string }[]; streams: { id: string; name: string; classId: string }[] };

export async function fetchSignupOptions() { const call = httpsCallable<void, SignupOptions>(functions, "fetchSignupOptions"); return (await call()).data; }

export async function submitSignupRequest(input: { role: SignupRole; displayName: string; phone?: string; email?: string; extra?: Record<string, unknown> }) {
  const call = httpsCallable<typeof input, { requestId: string; status: string }>(functions, "submitSignupRequest");
  return (await call(input)).data;
}
export async function fetchSignupRequests() {
  const call = httpsCallable<void, { requests: SignupRequest[] }>(functions, "fetchSignupRequests");
  return (await call()).data.requests;
}
export async function decideSignupRequest(requestId: string, decision: "approve" | "reject", password?: string, id?: string) {
  const call = httpsCallable<{ requestId: string; decision: string; password?: string; id?: string }, { status: string; id?: string; temporaryPassword?: string; deliveryStatus?: string }>(functions, "decideSignupRequest");
  return (await call({ requestId, decision, password, id })).data;
}
