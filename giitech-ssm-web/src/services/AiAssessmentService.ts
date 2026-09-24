import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig";
export async function generateAiAssessmentSuggestion(submissionId: string) { const call = httpsCallable(getFunctions(app), "generateAiAssessmentSuggestion"); return call({ submissionId }); }
