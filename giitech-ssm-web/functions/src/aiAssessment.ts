import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const openAiApiKey = defineSecret("OPENAI_API_KEY");
const openAiAssessmentModel = defineString("OPENAI_ASSESSMENT_MODEL", { default: "gpt-4.1-mini" });

export const generateAiAssessmentSuggestion = onCall({ secrets: [openAiApiKey] }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in is required.");
  const apiKey = openAiApiKey.value();
  const model = openAiAssessmentModel.value();
  if (!apiKey || !model) throw new HttpsError("failed-precondition", "AI assessment is not configured. Set the OpenAI secret and assessment model parameter.");
  const submissionId = String(request.data?.submissionId || "");
  if (!submissionId) throw new HttpsError("invalid-argument", "A submission ID is required.");
  const db = getFirestore();
  const usageDate = new Date().toISOString().slice(0, 10);
  const settingsSnapshot = await db.collection("aiSettings").doc("global").get();
  const dailyLimit = Math.max(0, Number(settingsSnapshot.data()?.dailyGenerationLimit ?? 100));
  const inputCostPerMillion = Math.max(0, Number(settingsSnapshot.data()?.inputCostPerMillion ?? 0));
  const outputCostPerMillion = Math.max(0, Number(settingsSnapshot.data()?.outputCostPerMillion ?? 0));
  const monthlyBudget = Math.max(0, Number(settingsSnapshot.data()?.monthlyBudget ?? 0));
  const usageRef = db.collection("aiUsage").doc(usageDate);
  const usageSnapshot = await usageRef.get();
  if (Number(usageSnapshot.data()?.generationCount || 0) >= dailyLimit) throw new HttpsError("resource-exhausted", "The daily AI assessment generation limit has been reached.");
  const usageMonth = new Date().toISOString().slice(0, 7);
  const monthlyUsageRef = db.collection("aiUsageMonths").doc(usageMonth);
  const monthlyUsageSnapshot = await monthlyUsageRef.get();
  if (monthlyBudget > 0 && Number(monthlyUsageSnapshot.data()?.estimatedCost || 0) >= monthlyBudget) throw new HttpsError("resource-exhausted", "The monthly AI assessment budget has been reached.");
  const submissionSnapshot = await db.collection("submissions").doc(submissionId).get();
  if (!submissionSnapshot.exists) throw new HttpsError("not-found", "Submission not found.");
  const submission = submissionSnapshot.data() || {};
  const existingSuggestion = submission.aiSuggestion as { status?: string } | undefined;
  if (existingSuggestion?.status === "pending") throw new HttpsError("already-exists", "This submission already has a pending AI suggestion.");
  if (existingSuggestion?.status === "approved") throw new HttpsError("failed-precondition", "This submission already has an approved AI suggestion.");
  const assignmentSnapshot = await db.collection("assignments").doc(String(submission.assignmentId || "")).get();
  const assignment = assignmentSnapshot.data() || {};
  if (String(assignment.teacherId || "") !== request.auth.uid) throw new HttpsError("permission-denied", "Only the assignment teacher can request an AI suggestion.");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/responses", { method: "POST", signal: controller.signal, headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" }, body: JSON.stringify({ model, store: false, input: [{ role: "system", content: "You are an assessment assistant. Suggest a score and concise constructive feedback. Never claim the score is final; a teacher must approve it." }, { role: "user", content: JSON.stringify({ assignment: { title: assignment.title, description: assignment.description, questions: assignment.questions }, submission: { responseText: submission.responseText, responses: submission.responses } }) }], text: { format: { type: "json_schema", name: "assessment_suggestion", strict: true, schema: { type: "object", properties: { score: { type: "number", minimum: 0, maximum: 100 }, feedback: { type: "string" } }, required: ["score", "feedback"], additionalProperties: false } } } }) });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new HttpsError("deadline-exceeded", "The AI provider did not respond within 30 seconds.");
    throw new HttpsError("unavailable", "The AI provider could not be reached.");
  } finally { clearTimeout(timeout); }
  if (!response.ok) throw new HttpsError("internal", `AI provider request failed with status ${response.status}.`);
  const payload = await response.json() as { output_text?: string };
  let result: { score: number; feedback: string };
  try { result = JSON.parse(payload.output_text || "{}"); } catch { throw new HttpsError("internal", "AI provider returned an invalid suggestion."); }
  const providerUsage = payload as { usage?: { input_tokens?: number; output_tokens?: number; total_tokens?: number } };
  const inputTokens = Number(providerUsage.usage?.input_tokens || 0); const outputTokens = Number(providerUsage.usage?.output_tokens || 0);
  const estimatedCost = (inputTokens / 1_000_000) * inputCostPerMillion + (outputTokens / 1_000_000) * outputCostPerMillion;
  await usageRef.set({ generationCount: FieldValue.increment(1), inputTokens: FieldValue.increment(inputTokens), outputTokens: FieldValue.increment(outputTokens), estimatedCost: FieldValue.increment(estimatedCost), lastGeneratedAt: FieldValue.serverTimestamp() }, { merge: true });
  await monthlyUsageRef.set({ generationCount: FieldValue.increment(1), inputTokens: FieldValue.increment(inputTokens), outputTokens: FieldValue.increment(outputTokens), estimatedCost: FieldValue.increment(estimatedCost), lastGeneratedAt: FieldValue.serverTimestamp() }, { merge: true });
  if (monthlyBudget > 0) {
    const updatedMonthlyUsage = await monthlyUsageRef.get();
    if (Number(updatedMonthlyUsage.data()?.estimatedCost || 0) >= monthlyBudget * 0.8) {
      const alertRef = db.collection("aiBudgetAlerts").doc(usageMonth);
      await db.runTransaction(async transaction => { const alert = await transaction.get(alertRef); if (!alert.exists) transaction.set(alertRef, { month: usageMonth, threshold: 0.8, estimatedCost: Number(updatedMonthlyUsage.data()?.estimatedCost || 0), budget: monthlyBudget, createdAt: FieldValue.serverTimestamp() }); });
    }
  }
  await submissionSnapshot.ref.update({ aiSuggestion: { score: Math.max(0, Math.min(100, Number(result.score))), feedback: String(result.feedback || ""), model, status: "pending", generatedAt: FieldValue.serverTimestamp(), generatedBy: request.auth.uid } });
  return { status: "pending" };
});
