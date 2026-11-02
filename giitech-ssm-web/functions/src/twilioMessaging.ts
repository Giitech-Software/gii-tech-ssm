import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onRequest as onHttpRequest } from "firebase-functions/v2/https";
import { logger } from "firebase-functions";

const accountSid = defineSecret("TWILIO_ACCOUNT_SID");
const authToken = defineSecret("TWILIO_AUTH_TOKEN");
const smsFrom = defineSecret("TWILIO_SMS_FROM");
const whatsappFrom = defineSecret("TWILIO_WHATSAPP_FROM");
const DEFAULT_LIMIT = 1000;
const DEFAULT_WHATSAPP_SENDER = "whatsapp:+14155238886";

type Channel = "sms" | "whatsapp";
const asChannel = (value: unknown): Channel => value === "whatsapp" ? "whatsapp" : "sms";

const STATUS_CALLBACK = "https://africa-south1-giitech-ssm.cloudfunctions.net/twilioMessageStatus";

async function sendTwilio(channel: Channel, from: string, to: string, body: string) {
  const sender = channel === "whatsapp" && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from;
  const recipient = channel === "whatsapp" && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to;
  const form = new URLSearchParams({ To: recipient, From: sender, Body: body, StatusCallback: STATUS_CALLBACK });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid.value()}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${accountSid.value()}:${authToken.value()}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  const payload = await response.json() as { sid?: string; status?: string; code?: number; message?: string; error_message?: string; more_info?: string };
  if (!response.ok) {
    const detail = payload.message || payload.error_message || `request failed with ${response.status}.`;
    throw new Error(`Twilio ${payload.code || response.status}: ${detail}${payload.more_info ? ` (${payload.more_info})` : ""}`);
  }
  return payload;
}

export const processBulkMessage = onDocumentCreated({ document: "bulkMessages/{messageId}", region: "africa-south1", secrets: [accountSid, authToken, smsFrom, whatsappFrom] }, async (event) => {
  const snapshot = event.data; if (!snapshot) return; const message = snapshot.data(); const tenantId = String(message.tenantId || ""); const channel = asChannel(message.channel); const body = String(message.message || ""); const db = getFirestore(); logger.info("Bulk message received", { messageId: snapshot.id, tenantId, channel, requestedRecipients: Array.isArray(message.recipientPhones) ? message.recipientPhones.length : 0 });
  if (!tenantId || !body) { await snapshot.ref.update({ status: "failed", failureReason: "Missing tenant or message body.", updatedAt: FieldValue.serverTimestamp() }); return; }
  const settings = (await db.collection("tenantMessagingSettings").doc(tenantId).get()).data() || {}; const limit = Math.max(0, Number(settings.monthlyMessageLimit ?? DEFAULT_LIMIT)); const month = new Date().toISOString().slice(0, 7); const usageRef = db.collection("tenantMessagingUsage").doc(`${tenantId}_${month}`);
  const usage = await db.runTransaction(async transaction => { const current = (await transaction.get(usageRef)).data() || {}; const sent = Number(current.messageCount || 0); if (sent >= limit) throw new Error("Monthly tenant messaging limit reached."); const next = sent + 1; transaction.set(usageRef, { tenantId, month, messageCount: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); return next; });
  const from = String(channel === "whatsapp" ? settings.whatsappSender || whatsappFrom.value() || DEFAULT_WHATSAPP_SENDER : settings.smsSender || smsFrom.value() || ""); if (!accountSid.value() || !authToken.value() || !from) { await snapshot.ref.update({ status: "failed", failureReason: "Twilio credentials or tenant sender is not configured.", usageCount: usage, updatedAt: FieldValue.serverTimestamp() }); return; }
  if (channel === "sms" && (!/^\+[1-9]\d{7,14}$/.test(from) || from.startsWith("whatsapp:"))) { await snapshot.ref.update({ status: "failed", failureReason: "TWILIO_SMS_FROM must be an SMS-capable number in E.164 format, such as +233241234567.", usageCount: usage, updatedAt: FieldValue.serverTimestamp() }); return; }
  if (channel === "whatsapp" && !/^whatsapp:\+[1-9]\d{7,14}$/.test(from)) { await snapshot.ref.update({ status: "failed", failureReason: "TWILIO_WHATSAPP_FROM must use whatsapp:+ followed by the sender number.", usageCount: usage, updatedAt: FieldValue.serverTimestamp() }); return; }
  const countryCode = String(settings.defaultCountryCode || "+233"); const normalizePhone = (value: string) => { const compact = value.trim().replace(/[\s().-]/g, ""); const international = compact.startsWith("0") ? `${countryCode}${compact.slice(1)}` : compact; return /^\+[1-9]\d{7,14}$/.test(international) ? international : ""; }; const recipients = (Array.isArray(message.recipientPhones) ? message.recipientPhones : []).map(value => normalizePhone(String(value))).filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
  if (!recipients.length) { await snapshot.ref.update({ status: "failed", failureReason: "No valid recipients were selected.", recipientCount: 0, deliveredCount: 0, failedCount: 0, usageCount: usage, updatedAt: FieldValue.serverTimestamp() }); return; }
  let sent = 0; let failed = 0; const errors: string[] = []; const deliveries: Record<string, unknown>[] = [];
  for (const recipient of recipients) { try { const result = await sendTwilio(channel, from, recipient, body); sent++; deliveries.push({ sid: result.sid || "", to: recipient, status: result.status || "sent", error: null }); } catch (error) { failed++; const reason = error instanceof Error ? error.message : "Provider error"; errors.push(reason); deliveries.push({ sid: "", to: recipient, status: "failed", error: reason }); } }
  const providerSids = deliveries.map((item) => String(item.sid || "")).filter(Boolean); const unitCost = Number(channel === "whatsapp" ? settings.whatsappCostUsd ?? 0 : settings.smsCostUsd ?? 0); const status = failed ? (sent ? "partial" : "failed") : "sent"; logger.info("Bulk message submission completed", { messageId: snapshot.id, channel, recipientCount: recipients.length, submittedCount: sent, failedCount: failed, status, failureReason: errors[0] || null }); await snapshot.ref.update({ status, provider: "twilio", channel, recipientCount: recipients.length, submittedCount: sent, deliveredCount: 0, failedCount: failed, deliveries, providerSids, estimatedCostUsd: Number((sent * unitCost).toFixed(6)), failureReason: errors[0] || null, sentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
});

export const twilioMessageStatus = onHttpRequest({ region: "africa-south1" }, async (request, response) => {
  const sid = String(request.body?.MessageSid || "");
  const messageStatus = String(request.body?.MessageStatus || "").toLowerCase();
  if (!sid || !messageStatus) { response.status(400).send("Missing Twilio status fields."); return; }
  const db = getFirestore();
  const matches = await db.collection("bulkMessages").where("providerSids", "array-contains", sid).limit(1).get();
  if (matches.empty) { response.status(204).send(""); return; }
  const messageRef = matches.docs[0].ref;
  const current = matches.docs[0].data();
  const deliveries = Array.isArray(current.deliveries) ? current.deliveries.map((item: Record<string, unknown>) => item.sid === sid ? { ...item, status: messageStatus, error: request.body?.ErrorCode || null, updatedAt: new Date().toISOString() } : item) : [];
  const deliveredCount = deliveries.filter((item: Record<string, unknown>) => ["delivered", "read"].includes(String(item.status))).length;
  const failedCount = deliveries.filter((item: Record<string, unknown>) => ["failed", "undelivered"].includes(String(item.status))).length;
  const terminal = deliveries.length > 0 && deliveries.every((item: Record<string, unknown>) => ["delivered", "read", "failed", "undelivered"].includes(String(item.status)));
  await messageRef.update({ deliveries, deliveredCount, failedCount, status: terminal ? (failedCount && deliveredCount ? "partial" : failedCount ? "failed" : "delivered") : "sent", updatedAt: FieldValue.serverTimestamp() });
  response.status(204).send("");
});

export const fanOutBulkInAppMessage = onDocumentCreated({ document: "bulkMessages/{messageId}", region: "africa-south1" }, async (event) => {
  const snapshot = event.data;
  if (!snapshot) return;
  const message = snapshot.data();
  if (message.sendInApp !== true || !Array.isArray(message.recipientUserIds) || !message.recipientUserIds.length) return;
  const db = getFirestore();
  const batch = db.batch();
  const userIds = [...new Set(message.recipientUserIds.map(String).filter(Boolean))];
  userIds.forEach((userId) => {
    const ref = db.collection("notifications").doc();
    batch.set(ref, {
      tenantId: String(message.tenantId || ""),
      recipientUserId: userId,
      title: "School message",
      message: String(message.message || ""),
      category: "announcement",
      active: true,
      read: false,
      sourceBulkMessageId: snapshot.id,
      createdBy: String(message.createdBy || ""),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  });
  await batch.commit();
  await snapshot.ref.update({ inAppStatus: "sent", inAppRecipientCount: userIds.length, updatedAt: FieldValue.serverTimestamp() });
});
