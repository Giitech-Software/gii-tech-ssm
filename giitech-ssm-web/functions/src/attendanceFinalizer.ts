import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";

const tenantId = "astem-ssm-001";

/** Finalizes the daily register after the configured school closing time. */
export const scheduledStudentAttendanceFinalizer = onSchedule({ schedule: "every 15 minutes", timeZone: "Africa/Accra", region: "europe-west1" }, async () => {
  const db = getFirestore();
  const settings = (await db.doc("staffAttendanceSettings/default").get()).data() || {};
  const closing = String(settings.closingTime || "16:00");
  const now = new Date();
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Accra", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(now);
  const currentMinutes = Number(parts.find(item => item.type === "hour")?.value || 0) * 60 + Number(parts.find(item => item.type === "minute")?.value || 0);
  const closingMinutes = Number(closing.split(":")[0]) * 60 + Number(closing.split(":")[1] || 0);
  if (currentMinutes < closingMinutes) return;
  const date = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Accra" }).format(now);
  const [students, records] = await Promise.all([
    db.collection("students").where("tenantId", "==", tenantId).get(),
    db.collection("attendance").where("tenantId", "==", tenantId).where("date", "==", date).get(),
  ]);
  const recorded = new Set(records.docs.map(item => String(item.data().studentId || "")));
  let batch = db.batch(); let writes = 0;
  for (const student of students.docs) {
    const data = student.data(); const studentId = String(data.studentId || student.id);
    if (recorded.has(studentId)) continue;
    const reference = db.collection("attendance").doc(`${date}_${studentId}`);
    batch.set(reference, { tenantId, studentId, studentName: data.displayName || data.studentName || data.name || studentId, classId: data.classId || "", date, present: false, status: "Absent", source: "automatic-close", createdAt: FieldValue.serverTimestamp() }, { merge: true });
    writes += 1;
    if (writes === 450) { await batch.commit(); batch = db.batch(); writes = 0; }
  }
  if (writes) await batch.commit();
});
