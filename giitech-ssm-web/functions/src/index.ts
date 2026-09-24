import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { synchronizeWorkflowEscalations } from "./escalations";
export { createAbsenteeAlert } from "./attendanceAlerts";
export { initiateMobileMoneyPayment, mobileMoneyWebhook, reconcilePaymentIntent } from "./paymentGateway";
export { generateAiAssessmentSuggestion } from "./aiAssessment";
export { createManagedUser, deleteManagedUser, updateManagedUserRole } from "./accounts";
export { scheduledLibraryOverdueSync } from "./library";
export { verifyAttendanceFace, enrollAttendanceFace } from "./rekognition";

initializeApp();

export const scheduledWorkflowEscalationSync = onSchedule(
  {
    schedule: "every 6 hours",
    timeZone: "Africa/Accra",
    region: "europe-west1",
  },
  async () => {
    const result = await synchronizeWorkflowEscalations();
    logger.info("Scheduled workflow escalation sync complete", result);
  },
);

export const syncWorkflowEscalations = onCall(
  { region: "africa-south1" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "Sign in is required.");
    const user = await getFirestore().collection("users").doc(request.auth.uid).get();
    const role = String(user.data()?.role || "").toLowerCase();
    if (!["admin", "superadmin"].includes(role)) {
      throw new HttpsError("permission-denied", "Administrator access is required.");
    }
    const result = await synchronizeWorkflowEscalations();
    logger.info("Manual workflow escalation sync complete", { ...result, userId: request.auth.uid });
    return result;
  },
);
