import { collection, doc, getDocs, query, where, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { TENANT_ID } from "../config/tenant";

// 🔹 Firestore structure example:
// attendance → { studentId, studentName, classId, date, present: true/false }

/**
 * Fetch summarized attendance for a given class
 */
export const fetchAttendanceSummary = async (classId: string) => {
  try {
    const q = query(collection(db, "attendance"), where("classId", "==", classId));
    const snapshot = await getDocs(q);
    const records: any[] = [];

    snapshot.forEach((doc) => {
      records.push({ id: doc.id, ...doc.data() });
    });

    // 🔹 Group by student
    const summary: Record<string, any> = {};
    for (const r of records) {
      const sid = r.studentId;
      if (!summary[sid]) {
        summary[sid] = {
          studentId: sid,
          studentName: r.studentName || "Unknown",
          present: 0,
          total: 0,
        };
      }
      summary[sid].total += 1;
      if (normaliseStatus(r) === "Present" || normaliseStatus(r) === "Late") summary[sid].present += 1;
    }

    return Object.values(summary);
  } catch (error) {
    console.error("❌ Error fetching attendance summary:", error);
    return [];
  }
};

export type AttendanceStatus = "Present" | "Absent" | "Late" | "Excused";

export const normaliseStatus = (record: any): AttendanceStatus => {
  const status = String(record?.status || "").toLowerCase();
  if (status === "late") return "Late";
  if (status === "excused") return "Excused";
  if (status === "present" || record?.present === true) return "Present";
  return "Absent";
};

export const attendanceRecordId = (studentId: string, date: string) => `${studentId}_${date}`;

/**
 * Get all attendance records for a specific class
 * (Detailed list view for teachers)
 */
export const getAttendanceByClass = async (classId: string) => {
  try {
    const q = query(collection(db, "attendance"), where("classId", "==", classId));
    const snapshot = await getDocs(q);
    const records: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      records.push({
        id: doc.id,
        studentId: data.studentId,
        studentName: data.studentName || "Unknown",
        date: data.date,
        status: normaliseStatus(data),
        reason: data.lateReason || data.earlyDepartureReason || "",
        method: data.method || data.source || "manual",
        checkInAt: data.checkInAt || null,
        checkOutAt: data.checkOutAt || null,
      });
    });

    return records.sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  } catch (error) {
    console.error("❌ Error fetching attendance by class:", error);
    return [];
  }
};

/**
 * 🔹 NEW: Fetch all students belonging to a specific class
 * Used when teachers open the "Mark Attendance" page
 */
export const getStudentsByClass = async (classId: string) => {
  try {
    const q = query(collection(db, "students"), where("classId", "==", classId));
    const snapshot = await getDocs(q);
    const students: any[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      students.push({
        id: doc.id,
        studentId: data.studentId || doc.id,
        studentName: data.displayName || data.studentName || data.name || "Unnamed Student",
      });
    });

    console.log(`✅ Loaded ${students.length} students for class ${classId}`);
    return students;
  } catch (error) {
    console.error("❌ Error fetching students by class:", error);
    return [];
  }
};

/**
 * 🔹 Mark attendance for a given class
 * Used by teachers to submit daily attendance
 */
export const markAttendanceForClass = async (
  classId: string,
  attendanceList: { studentId: string; studentName: string; status: AttendanceStatus; lateReason?: string; earlyDepartureReason?: string }[],
  teacherId: string,
  mode: "check-in" | "check-out" = "check-in",
  date = new Date().toISOString().split("T")[0],
) => {
  try {
    const attendanceCollection = collection(db, "attendance");
    const batch = writeBatch(db);

    for (const record of attendanceList) {
      const timestamp = new Date().toISOString();
      const reference = doc(attendanceCollection, attendanceRecordId(record.studentId, date));
      batch.set(reference, {
        tenantId: TENANT_ID,
        studentId: record.studentId,
        studentName: record.studentName,
        present: record.status === "Present" || record.status === "Late",
        status: record.status,
        classId,
        teacherId,
        ...(mode === "check-in" ? { checkInAt: timestamp } : { checkOutAt: timestamp }),
        method: "manual",
        ...(record.lateReason ? { lateReason: record.lateReason } : {}),
        ...(record.earlyDepartureReason ? { earlyDepartureReason: record.earlyDepartureReason } : {}),
        audit: { actorId: teacherId, action: "manual-register", recordedAt: timestamp, mode },
        date,
        createdAt: serverTimestamp(),
      });
    }
    await batch.commit();

    console.log(`✅ Attendance marked for class ${classId}:`, attendanceList);
    return { success: true };
  } catch (error) {
    console.error("❌ Error marking attendance:", error);
    throw error;
  }
};

/** Returns records for a class and date range, including legacy records. */
export const getAttendanceHistory = async (classId: string, startDate: string, endDate: string) => {
  const snapshot = await getDocs(query(collection(db, "attendance"), where("classId", "==", classId)));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data(), status: normaliseStatus(item.data()) }))
    .filter((item: any) => String(item.date || "") >= startDate && String(item.date || "") <= endDate)
    .sort((a: any, b: any) => String(b.date).localeCompare(String(a.date)));
};
