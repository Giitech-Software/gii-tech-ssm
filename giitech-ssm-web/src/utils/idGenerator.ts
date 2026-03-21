import { doc, runTransaction, getFirestore } from "firebase/firestore";

const db = getFirestore();

/**
 * ✅ Universal Firestore counter-based ID generator
 * Generates sequential IDs like SUP001, ADM001, TEA001, STU001, PAR001, DEPT001, CLS001, STR001, FEE001, etc.
 * Each prefix has its own counter document in the `counters` collection.
 */
export async function generateId(type: string): Promise<string> {
  const prefixMap: Record<string, string> = {
    superadmin: "SUP",
    admin: "ADM",
    teacher: "TEA",
    student: "STU",
    parent: "PAR",
    department: "DEPT",
    class: "CLS",
    stream: "STR",
    fee: "FEE",
    subject: "SUB",
    attendance: "ATT",
    grade: "GRD",
    performance: "PERF",
    report: "REP",
  };

  // Determine prefix or default to "GEN"
  const prefix = prefixMap[type.toLowerCase()] ?? "GEN";
  const counterRef = doc(db, "counters", prefix);

  const newId = await runTransaction(db, async (transaction) => {
    const counterDoc = await transaction.get(counterRef);
    let last = 0;

    if (!counterDoc.exists()) {
      // Initialize counter if this prefix is used for the first time
      transaction.set(counterRef, { last: 0 });
    } else {
      last = counterDoc.data().last || 0;
    }

    const next = last + 1;
    transaction.set(counterRef, { last: next }, { merge: true });

    // Return formatted ID (e.g., CLS001)
    return `${prefix}${String(next).padStart(3, "0")}`;
  });

  return newId;
}

/**
 * ✅ Legacy-style alias for user IDs (still supported)
 * Example: generateUserId("teacher") → TEA001
 */
export async function generateUserId(role: string): Promise<string> {
  return generateId(role);
}

/**
 * ✅ Department ID Generator
 * Example: DEPT001
 */
export async function generateDepartmentId(): Promise<string> {
  return generateId("department");
}

/**
 * ✅ Class ID Generator
 * Example: CLS001
 */
export async function generateClassId(): Promise<string> {
  return generateId("class");
}

/**
 * ✅ Stream ID Generator
 * Example: STR001
 */
export async function generateStreamId(): Promise<string> {
  return generateId("stream");
}

/**
 * ✅ Fee ID Generator
 * Example: FEE001
 */
export async function generateFeeId(): Promise<string> {
  return generateId("fee");
}

/**
 * ✅ Student ID Generator
 * Example: STU001
 */
export async function generateStudentId(): Promise<string> {
  return generateId("student");
}

/**
 * ✅ Teacher ID Generator
 * Example: TEA001
 */
export async function generateTeacherId(): Promise<string> {
  return generateId("teacher");
}

/**
 * ✅ Attendance ID Generator
 * Example: ATT001
 */
export async function generateAttendanceId(): Promise<string> {
  return generateId("attendance");
}

/**
 * ✅ Grade ID Generator
 * Example: GRD001
 */
export async function generateGradeId(): Promise<string> {
  return generateId("grade");
}
