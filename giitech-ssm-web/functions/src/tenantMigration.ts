import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const tenantId = "astem-ssm-001";
const collections = ["users", "students", "teachers", "staff", "attendance", "staffAttendance", "attendanceFaceEnrollments", "attendanceFaceVerifications"];

export const backfillAstemTenant = onCall({ region: "africa-south1" }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in is required.");
  const db = getFirestore(); const profile = await db.collection("users").doc(request.auth.uid).get();
  if (!["admin", "superadmin"].includes(String(profile.data()?.role || "").toLowerCase())) throw new HttpsError("permission-denied", "Administrator access is required.");
  let updated = 0;
  for (const name of collections) {
    const snapshot = await db.collection(name).get();
    let batch = db.batch(); let writes = 0;
    for (const item of snapshot.docs) { if (item.data().tenantId) continue; batch.update(item.ref, { tenantId, migratedAt: FieldValue.serverTimestamp() }); writes++; updated++; if (writes === 450) { await batch.commit(); batch = db.batch(); writes = 0; } }
    if (writes) await batch.commit();
  }
  return { tenantId, updated };
});
