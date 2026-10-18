import { collection, doc, getDoc, getDocs, query, serverTimestamp, setDoc, where } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";

export type StaffAttendanceRecord = {
  id: string;
  staffId: string;
  date: string;
  term?: string;
  academicYear?: string;
  status: "present" | "absent" | "late";
  note?: string;
  checkInAt?: string;
  checkOutAt?: string;
  movementEvents?: Array<{ type: "out" | "in"; time: string; reason?: string; earlyDeparture?: boolean }>;
  userId?: string;
  verificationMethod?: "web-session" | "webauthn" | "qr" | "biometric" | "qr+biometric" | "rekognition-face-match";
  verifiedAt?: string;
};
export type StaffAttendanceSettings = { startTime: string; closingTime: string; graceMinutes: number; staffQrEnabled: boolean; staffBiometricEnabled: boolean; verificationMode: "biometric" | "qr" | "facial" | "both" | "disabled" };

export async function getStaffAttendanceSettings(): Promise<StaffAttendanceSettings> { const snapshot = await getDoc(doc(db, "staffAttendanceSettings", "default")); return ({ startTime: "08:00", closingTime: "16:00", graceMinutes: 15, staffQrEnabled: false, staffBiometricEnabled: true, verificationMode: "biometric", ...(snapshot.data() || {}) }) as StaffAttendanceSettings; }
export async function saveStaffAttendanceSettings(settings: StaffAttendanceSettings) { await setDoc(doc(db, "staffAttendanceSettings", "default"), { ...settings, updatedAt: serverTimestamp() }, { merge: true }); }

export async function getStaffAttendance(staffId: string, userId = getAuth().currentUser?.uid || "") {
  const filters = userId ? [where("tenantId", "==", TENANT_ID), where("userId", "==", userId)] : [where("tenantId", "==", TENANT_ID), where("staffId", "==", staffId)];
  const snapshot = await getDocs(query(collection(db, "staffAttendance"), ...filters));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StaffAttendanceRecord));
}

export async function getStaffIdentity(userId: string) {
  const [teacherSnapshot, staffSnapshot] = await Promise.all([getDocs(query(collection(db, "teachers"), where("userId", "==", userId))), getDocs(query(collection(db, "staff"), where("userId", "==", userId)))]);
  const item = teacherSnapshot.docs[0] || staffSnapshot.docs[0];
  if (!item) {
    const userSnapshot = await getDoc(doc(db, "users", userId));
    const data = userSnapshot.data() || {};
    return { staffId: String(data.id || userId), displayName: String(data.displayName || "Administrator"), userId, attendanceEnabled: data.attendanceEnabled !== false };
  }
  const data = item.data();
  return { staffId: String(data.teacherId || item.id), displayName: String(data.displayName || "Staff member"), userId, attendanceEnabled: data.attendanceEnabled !== false };
}

export async function saveStaffAttendance(staffId: string, date: string, status: StaffAttendanceRecord["status"], note: string, userId = staffId, verificationMethod: StaffAttendanceRecord["verificationMethod"] = "web-session") {
  const reference = doc(db, "staffAttendance", `${staffId}_${date}`); const existing = await getDoc(reference); if (existing.data()?.checkInAt) throw new Error("Your attendance has already been checked in for today.");
  const settings = await getStaffAttendanceSettings(); const now = new Date(); const current = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`; const startMinutes = Number(settings.startTime.split(":")[0]) * 60 + Number(settings.startTime.split(":")[1]); const currentMinutes = now.getHours() * 60 + now.getMinutes(); const computedStatus = currentMinutes > startMinutes + settings.graceMinutes && status === "present" ? "late" : status;
  await setDoc(reference, {
    tenantId: TENANT_ID,
    staffId,
    userId,
    date,
    status: computedStatus,
    checkInAt: current,
    note: note.trim(),
    verificationMethod,
    verifiedAt: new Date().toISOString(),
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

export async function recordStaffMovement(staffId: string, date: string, type: "out" | "in", reason: string, userId = staffId) { const settings = await getStaffAttendanceSettings(); const reference = doc(db, "staffAttendance", `${staffId}_${date}`); const existing = await getDoc(reference); const now = new Date(); const currentMinutes = now.getHours() * 60 + now.getMinutes(); const closingMinutes = Number(settings.closingTime.split(":")[0]) * 60 + Number(settings.closingTime.split(":")[1]); const events = (existing.data()?.movementEvents || []) as StaffAttendanceRecord["movementEvents"]; await setDoc(reference, { tenantId: TENANT_ID, staffId, userId, date, movementEvents: [...(events || []), { type, time: now.toISOString(), reason: reason.trim(), earlyDeparture: type === "out" && currentMinutes < closingMinutes }], updatedAt: serverTimestamp() }, { merge: true }); }

export async function getAllStaffAttendance() {
  const snapshot = await getDocs(query(collection(db, "staffAttendance"), where("tenantId", "==", TENANT_ID)));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() } as StaffAttendanceRecord));
}
