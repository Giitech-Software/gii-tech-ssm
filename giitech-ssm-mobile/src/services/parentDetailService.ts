import { collection, doc, documentId, getDoc, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "parent-data";

export type ParentStudent = {
  studentId: string;
  displayName: string;
  classId: string;
};

export type ParentGrade = {
  id: string;
  studentId: string;
  studentName: string;
  title: string;
  subject: string;
  score: number;
  total: number;
  percentage: number;
};

export type ParentAttendance = {
  id: string;
  studentId: string;
  studentName: string;
  date: string;
  status: "Present" | "Absent";
};

export type ParentLedger = {
  studentId: string;
  studentName: string;
  charged: number;
  paid: number;
  balance: number;
};

export type ParentPayment = {
  id: string;
  receiptNumber: string;
  studentName: string;
  amount: number;
  term: string;
  paymentMethod: string;
};

export type ParentReport = {
  id: string;
  studentId: string;
  studentName: string;
  className: string;
  academicYear: string;
  term: string;
  averageGrade: number;
  attendance: { present: number; total: number };
  subjects: { name: string; mark: number; grade: string }[];
};

export type ParentData = {
  students: ParentStudent[];
  grades: ParentGrade[];
  attendance: ParentAttendance[];
  ledgers: ParentLedger[];
  payments: ParentPayment[];
  reports: ParentReport[];
  loadedAt: string;
  source: "live" | "cache";
};

function chunkIds(ids: string[]) {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  return Array.from({ length: Math.ceil(uniqueIds.length / 10) }, (_, index) =>
    uniqueIds.slice(index * 10, index * 10 + 10)
  );
}

type RawRecord = Record<string, unknown> & { id: string };

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

async function fetchByStudentIds(collectionName: string, studentIds: string[]) {
  const snapshots = await Promise.all(
    chunkIds(studentIds).map((ids) =>
      getDocs(query(collection(db, collectionName), where("studentId", "in", ids)))
    )
  );
  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as RawRecord)
  );
}

export async function fetchParentStudentIds(userId: string) {
  const snapshot = await getDocs(
    query(collection(db, "parents"), where("userId", "==", userId))
  );
  if (!snapshot.empty) return (snapshot.docs[0].data().studentIds || []) as string[];

  const legacyProfile = await getDoc(doc(db, "parents", userId));
  return legacyProfile.exists() ? ((legacyProfile.data().studentIds || []) as string[]) : [];
}

async function fetchStudents(studentIds: string[]) {
  const snapshots = await Promise.all(
    chunkIds(studentIds).map((ids) =>
      getDocs(query(collection(db, "students"), where(documentId(), "in", ids)))
    )
  );
  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((item) => {
      const student = item.data();
      return {
        studentId: String(student.studentId || item.id),
        displayName: String(student.displayName || student.studentName || "Student"),
        classId: String(student.classId || ""),
      };
    })
  );
}

async function fetchPublishedReports(studentIds: string[]) {
  const snapshots = await Promise.all(
    chunkIds(studentIds).map((ids) =>
      getDocs(
        query(
          collection(db, "studentReports"),
          where("studentId", "in", ids),
          where("published", "==", true)
        )
      )
    )
  );
  return snapshots.flatMap((snapshot) =>
    snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as RawRecord)
  );
}

function studentName(students: ParentStudent[], studentId: string) {
  return students.find((student) => student.studentId === studentId)?.displayName || studentId;
}

export async function fetchParentData(userId: string): Promise<ParentData> {
  try {
    const studentIds = await fetchParentStudentIds(userId);
    const [students, grades, attendance, charges, payments, reports] = await Promise.all([
      fetchStudents(studentIds),
      fetchByStudentIds("grades", studentIds),
      fetchByStudentIds("attendance", studentIds),
      fetchByStudentIds("studentCharges", studentIds),
      fetchByStudentIds("feePayments", studentIds),
      fetchPublishedReports(studentIds),
    ]);
    const ledgers = new Map<string, ParentLedger>();

    studentIds.forEach((studentId) => {
      ledgers.set(studentId, {
        studentId,
        studentName: studentName(students, studentId),
        charged: 0,
        paid: 0,
        balance: 0,
      });
    });
    charges.forEach((charge) => {
      const ledger = ledgers.get(String(charge.studentId));
      if (!ledger) return;
      ledger.charged += Number(charge.amount) || 0;
      ledger.balance = ledger.charged - ledger.paid;
    });
    payments.forEach((payment) => {
      const ledger = ledgers.get(String(payment.studentId));
      if (!ledger) return;
      ledger.paid += Number(payment.amount) || 0;
      ledger.balance = ledger.charged - ledger.paid;
    });

    const result: ParentData = {
      students,
      grades: grades.map((grade) => {
        const score = Number(grade.score ?? grade.mark ?? 0);
        const total = Number(grade.total || 100);
        return {
          id: String(grade.id),
          studentId: String(grade.studentId),
          studentName: studentName(students, String(grade.studentId)),
          title: String(grade.assignmentTitle || grade.subject || "Recorded grade"),
          subject: String(grade.subject || "General"),
          score,
          total,
          percentage: total ? Math.round((score / total) * 100) : 0,
        };
      }),
      attendance: attendance.map((record) => {
        const present =
          typeof record.present === "boolean" ? record.present : record.status === "Present";
        return {
          id: String(record.id),
          studentId: String(record.studentId),
          studentName: studentName(students, String(record.studentId)),
          date: String(record.date || ""),
          status: present ? "Present" : "Absent",
        };
      }),
      ledgers: [...ledgers.values()],
      payments: payments.map((payment) => ({
        id: String(payment.id),
        receiptNumber: String(payment.receiptNumber || payment.id),
        studentName: studentName(students, String(payment.studentId)),
        amount: Number(payment.amount) || 0,
        term: String(payment.term || ""),
        paymentMethod: String(payment.paymentMethod || ""),
      })),
      reports: reports
        .filter((report) => report.published === true)
        .map((report) => {
          const reportAttendance = asRecord(report.attendance);
          return {
            id: String(report.id),
            studentId: String(report.studentId),
            studentName: String(report.studentName || studentName(students, String(report.studentId))),
            className: String(report.className || ""),
            academicYear: String(report.academicYear || ""),
            term: String(report.term || ""),
            averageGrade: Number(report.averageGrade) || 0,
            attendance: {
              present: Number(reportAttendance.present) || 0,
              total: Number(reportAttendance.total) || 0,
            },
            subjects: Array.isArray(report.subjects)
              ? report.subjects.map((subject) => {
                  const record = asRecord(subject);
                  return {
                    name: String(record.name || ""),
                    mark: Number(record.mark) || 0,
                    grade: String(record.grade || ""),
                  };
                })
              : [],
          };
        }),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData(CACHE_SCOPE, userId, result);
    return result;
  } catch (error) {
    const cached = await readCachedData<ParentData | null>(CACHE_SCOPE, userId, null);
    if (cached) return { ...cached, source: "cache" };
    throw error;
  }
}

export function parentAttendanceRate(records: ParentAttendance[]) {
  return records.length
    ? Math.round((records.filter((record) => record.status === "Present").length / records.length) * 100)
    : 0;
}

export function parentOutstandingBalance(ledgers: ParentLedger[]) {
  return ledgers.reduce((total, ledger) => total + Math.max(ledger.balance, 0), 0);
}
