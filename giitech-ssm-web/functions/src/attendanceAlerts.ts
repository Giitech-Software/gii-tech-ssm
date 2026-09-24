import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { onDocumentWritten } from "firebase-functions/v2/firestore";

const clean = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "_");

export const createAbsenteeAlert = onDocumentWritten("attendance/{attendanceId}", async (event) => {
  const after = event.data?.after.data();
  if (!after) return;
  const absent = after.present === false || String(after.status || "").toLowerCase() === "absent";
  const studentId = String(after.studentId || "");
  const date = String(after.date || "");
  if (!studentId || !date) return;

  const db = getFirestore();
  const notificationRef = db.collection("notifications").doc(`absence_${clean(studentId)}_${clean(date)}`);
  if (!absent) {
    await notificationRef.set({ active: false, resolvedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    return;
  }

  const studentSnapshot = await db.collection("students").doc(studentId).get();
  const student = studentSnapshot.data() || {};
  const studentName = String(after.studentName || student.displayName || studentId);
  const parentId = String(student.parentId || "");
  let parentUserId = "";
  if (parentId) {
    const parentSnapshot = await db.collection("parents").doc(parentId).get();
    parentUserId = String(parentSnapshot.data()?.userId || "");
  }
  await notificationRef.set({
    title: "Student absence recorded",
    message: `${studentName} was marked absent on ${date}.`,
    category: "alert",
    workflow: "attendance_absence",
    managed: true,
    active: true,
    target: studentId,
    recipientRoles: ["admin", "superadmin"],
    deliveryChannels: ["inApp"],
    ...(parentUserId ? { recipientUserId: parentUserId } : {}),
    route: "/admin/attendance-analytics",
    updatedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
  }, { merge: true });

  const recipients = await db.collection("users").get();
  const tokens = new Set<string>();
  recipients.docs.forEach((userDocument) => {
    const profile = userDocument.data();
    const role = String(profile.role || "").toLowerCase();
    const isAdministrator = role === "admin" || role === "superadmin";
    const isLinkedParent = parentUserId && userDocument.id === parentUserId;
    if (!isAdministrator && !isLinkedParent) return;
    const preferences = profile.notificationPreferences || {};
    if (preferences.push === false) return;
    (Array.isArray(profile.pushTokens) ? profile.pushTokens : []).forEach((token: unknown) => {
      if (typeof token === "string" && token) tokens.add(token);
    });
  });
  if (!tokens.size) return;
  const response = await getMessaging().sendEachForMulticast({
    tokens: [...tokens],
    notification: { title: "Student absence recorded", body: `${studentName} was marked absent on ${date}.` },
    data: { workflow: "attendance_absence", studentId, date, route: "/admin/attendance-analytics" },
  });
  console.info("Absentee push notifications sent", { studentId, date, successCount: response.successCount, failureCount: response.failureCount });
});
