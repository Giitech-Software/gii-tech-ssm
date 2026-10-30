import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { defineSecret } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { logger } from "firebase-functions";

const accountSid = defineSecret("TWILIO_ACCOUNT_SID");
const authToken = defineSecret("TWILIO_AUTH_TOKEN");
const smsFrom = defineSecret("TWILIO_SMS_FROM");
const whatsappFrom = defineSecret("TWILIO_WHATSAPP_FROM");
const DEFAULT_LIMIT = 1000;
const DEFAULT_SMS_SENDER = "+16092627371";
const DEFAULT_WHATSAPP_SENDER = "whatsapp:+14155238886";

type Channel = "sms" | "whatsapp";
const asChannel = (value: unknown): Channel => value === "whatsapp" ? "whatsapp" : "sms";

async function sendTwilio(channel: Channel, from: string, to: string, body: string) {
  const sender = channel === "whatsapp" && !from.startsWith("whatsapp:") ? `whatsapp:${from}` : from;
  const recipient = channel === "whatsapp" && !to.startsWith("whatsapp:") ? `whatsapp:${to}` : to;
  const form = new URLSearchParams({ To: recipient, From: sender, Body: body });
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid.value()}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${accountSid.value()}:${authToken.value()}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: form });
  const payload = await response.json() as { sid?: string; status?: string; code?: number; message?: string; error_message?: string };
  if (!response.ok) throw new Error(`Twilio ${payload.code || response.status}: ${payload.message || payload.error_message || `request failed with ${response.status}.`}`);
  return payload;
}

export const processBulkMessage = onDocumentCreated({ document: "bulkMessages/{messageId}", region: "africa-south1", secrets: [accountSid, authToken, smsFrom, whatsappFrom] }, async (event) => {
  const snapshot = event.data; if (!snapshot) return; const message = snapshot.data(); const tenantId = String(message.tenantId || ""); const channel = asChannel(message.channel); const body = String(message.message || ""); const db = getFirestore(); logger.info("Bulk message received", { messageId: snapshot.id, tenantId, channel, requestedRecipients: Array.isArray(message.recipientPhones) ? message.recipientPhones.length : 0 });
  if (!tenantId || !body) { await snapshot.ref.update({ status: "failed", failureReason: "Missing tenant or message body.", updatedAt: FieldValue.serverTimestamp() }); return; }
  const settings = (await db.collection("tenantMessagingSettings").doc(tenantId).get()).data() || {}; const limit = Math.max(0, Number(settings.monthlyMessageLimit ?? DEFAULT_LIMIT)); const month = new Date().toISOString().slice(0, 7); const usageRef = db.collection("tenantMessagingUsage").doc(`${tenantId}_${month}`);
  const usage = await db.runTransaction(async transaction => { const current = (await transaction.get(usageRef)).data() || {}; const sent = Number(current.messageCount || 0); if (sent >= limit) throw new Error("Monthly tenant messaging limit reached."); const next = sent + 1; transaction.set(usageRef, { tenantId, month, messageCount: next, updatedAt: FieldValue.serverTimestamp() }, { merge: true }); return next; });
  const from = String(channel === "whatsapp" ? settings.whatsappSender || whatsappFrom.value() || DEFAULT_WHATSAPP_SENDER : settings.smsSender || smsFrom.value() || DEFAULT_SMS_SENDER); if (!accountSid.value() || !authToken.value() || !from) { await snapshot.ref.update({ status: "failed", failureReason: "Twilio credentials or tenant sender is not configured.", usageCount: usage, updatedAt: FieldValue.serverTimestamp() }); return; }
  const countryCode = String(settings.defaultCountryCode || "+233"); const normalizePhone = (value: string) => { const compact = value.trim().replace(/[\s().-]/g, ""); const international = compact.startsWith("0") ? `${countryCode}${compact.slice(1)}` : compact; return /^\+[1-9]\d{7,14}$/.test(international) ? international : ""; }; const recipients = (Array.isArray(message.recipientPhones) ? message.recipientPhones : []).map(value => normalizePhone(String(value))).filter((value, index, all) => Boolean(value) && all.indexOf(value) === index);
  if (!recipients.length) { await snapshot.ref.update({ status: "failed", failureReason: "No valid recipients were selected.", recipientCount: 0, deliveredCount: 0, failedCount: 0, usageCount: usage, updatedAt: FieldValue.serverTimestamp() }); return; }
  let delivered = 0; let failed = 0; const errors: string[] = [];
  for (const recipient of recipients) { try { await sendTwilio(channel, from, recipient, body); delivered++; } catch (error) { failed++; errors.push(error instanceof Error ? error.message : "Provider error"); } }
  const unitCost = Number(channel === "whatsapp" ? settings.whatsappCostUsd ?? 0 : settings.smsCostUsd ?? 0); const status = failed ? (delivered ? "partial" : "failed") : "sent"; logger.info("Bulk message delivery completed", { messageId: snapshot.id, channel, recipientCount: recipients.length, deliveredCount: delivered, failedCount: failed, status, failureReason: errors[0] || null }); await snapshot.ref.update({ status, provider: "twilio", channel, recipientCount: recipients.length, deliveredCount: delivered, failedCount: failed, estimatedCostUsd: Number((delivered * unitCost).toFixed(6)), failureReason: errors[0] || null, sentAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
});
