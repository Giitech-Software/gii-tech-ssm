import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

export const sendPushNotification = onDocumentCreated({ document: "notifications/{notificationId}", region: "africa-south1" }, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const notification = snapshot.data();
  const userId = String(notification.recipientUserId || "");
  const tenantId = String(notification.tenantId || "");
  if (!userId || !tenantId) return;
  const tokens = await getFirestore().collection("deviceTokens").where("tenantId", "==", tenantId).where("userId", "==", userId).where("enabled", "==", true).get();
  if (tokens.empty) return;
  const messages = tokens.docs.map((item) => ({ to: String(item.data().token), title: String(notification.title || "School notification"), body: String(notification.message || ""), sound: "default", data: { route: String(notification.route || "/shared/notifications"), notificationId: snapshot.id } }));
  const response = await fetch("https://exp.host/--/api/v2/push/send", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(messages) });
  if (!response.ok) { logger.error("Push notification delivery failed", { notificationId: snapshot.id, status: response.status }); return; }
  await snapshot.ref.update({ pushStatus: "submitted", pushSubmittedAt: FieldValue.serverTimestamp() });
});
