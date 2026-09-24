import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type AiSuggestion = { score: number; feedback: string; generatedAt?: unknown; generatedBy?: string; model?: string; status?: "pending" | "approved" | "rejected" };
export async function approveAiSuggestion(submissionId: string, suggestion: AiSuggestion, reviewerId: string) { await updateDoc(doc(db, "submissions", submissionId), { score: suggestion.score, feedback: suggestion.feedback, status: "graded", aiSuggestion: { ...suggestion, status: "approved" }, aiApprovedAt: serverTimestamp(), aiApprovedBy: reviewerId }); }
export async function rejectAiSuggestion(submissionId: string, suggestion: AiSuggestion, reviewerId: string) { await updateDoc(doc(db, "submissions", submissionId), { aiSuggestion: { ...suggestion, status: "rejected" }, aiRejectedAt: serverTimestamp(), aiRejectedBy: reviewerId }); }
