import { collection, getDocs, addDoc, query, where, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

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
      if (r.present) summary[sid].present += 1;
    }

    return Object.values(summary);
  } catch (error) {
    console.error("❌ Error fetching attendance summary:", error);
    return [];
  }
};

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
        status: data.present ? "Present" : "Absent",
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
        studentName: data.studentName || data.name || "Unnamed Student",
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
  attendanceList: { studentId: string; studentName: string; present: boolean }[]
) => {
  try {
    const attendanceCollection = collection(db, "attendance");
    const date = new Date().toISOString().split("T")[0];

    for (const record of attendanceList) {
      await addDoc(attendanceCollection, {
        ...record,
        classId,
        date,
        createdAt: Timestamp.now(),
      });
    }

    console.log(`✅ Attendance marked for class ${classId}:`, attendanceList);
    return { success: true };
  } catch (error) {
    console.error("❌ Error marking attendance:", error);
    throw error;
  }
};
