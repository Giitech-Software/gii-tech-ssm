import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

export type TeacherResult<T> = {
  data: T;
  loadedAt: string;
  source: "live" | "cache";
};

export type TeacherClass = {
  id: string;
  classId: string;
  name: string;
};

export type TeacherAssignment = {
  id: string;
  title: string;
  subject: string;
  description: string;
  classId: string;
  academicYear: string;
  term: string;
  termId: string;
  dueDate: string;
  type: string;
  pending: boolean;
};

export type TeacherSubmissionResponse = {
  question: string;
  selected: string;
  correct?: boolean;
};

export type TeacherSubmission = {
  id: string;
  assignmentId: string;
  assignmentTitle: string;
  subject: string;
  classId: string;
  studentId: string;
  studentName: string;
  submissionUrl: string;
  responseText: string;
  answers: string[];
  responses: TeacherSubmissionResponse[];
  score: number | null;
  feedback: string;
  status: string;
  submittedAt: string;
  pending: boolean;
};

export type TeacherStudent = {
  studentId: string;
  studentName: string;
};

export type TeacherAttendanceStatus = "Present" | "Absent" | "Pending";

export type TeacherAttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  date: string;
  status: "Present" | "Absent";
};

export type TeacherClassRegister = {
  students: TeacherStudent[];
  records: TeacherAttendanceRecord[];
};

export type TeacherExamAssessment = {
  id: string;
  name: string;
  classId: string;
  termId: string;
  term: string;
  academicYear: string;
  startDate: string;
  endDate: string;
};

export type TeacherExamGrade = {
  id: string;
  studentId: string;
  studentName: string;
  mark: number;
  pending: boolean;
};

export type TeacherExamRegister = {
  students: TeacherStudent[];
  grades: TeacherExamGrade[];
};

export type TeacherDashboardSummary = {
  assignments: number;
  activeAssignments: number;
  pendingGrading: number;
  classes: number;
  source: "live" | "cache";
};

export type TeacherGradeRecord = {
  id: string;
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  subject: string;
  assignmentTitle: string;
  examName: string;
  assessmentType: string;
  term: string;
  academicYear: string;
  score: number;
  total: number;
  feedback: string;
  updatedAt: string;
  pending: boolean;
};

export type TeacherGradeSummary = {
  grades: TeacherGradeRecord[];
  average: number;
  gradedStudents: number;
  subjects: number;
};

type TimestampLike = {
  seconds?: number;
  toDate?: () => Date;
};

function asIsoDate(value: unknown) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString();

  const timestamp = value as TimestampLike;
  if (typeof timestamp.toDate === "function") return timestamp.toDate().toISOString();
  if (typeof timestamp.seconds === "number") return new Date(timestamp.seconds * 1000).toISOString();

  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

async function withCache<T>(scope: string, key: string, load: () => Promise<T>): Promise<TeacherResult<T>> {
  try {
    const result: TeacherResult<T> = {
      data: await load(),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData(scope, key, result);
    return result;
  } catch (error) {
    const cached = await readCachedData<TeacherResult<T> | null>(scope, key, null);
    if (cached) return { ...cached, source: "cache" };
    throw error;
  }
}

function assignmentFromData(id: string, data: Record<string, unknown>, pending = false): TeacherAssignment {
  return {
    id,
    title: String(data.title || "Untitled assignment"),
    subject: String(data.subject || "General"),
    description: String(data.description || ""),
    classId: String(data.classId || ""),
    academicYear: String(data.academicYear || ""),
    term: String(data.term || ""),
    termId: String(data.termId || ""),
    dueDate: asIsoDate(data.dueDate),
    type: String(data.type || "essay"),
    pending,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asScore(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const parsed = Number.parseFloat(String(value || ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function submissionFromData(
  id: string,
  data: Record<string, unknown>,
  assignments: Map<string, TeacherAssignment>,
  pending = false
): TeacherSubmission {
  const assignmentId = String(data.assignmentId || "");
  const assignment = assignments.get(assignmentId);
  return {
    id,
    assignmentId,
    assignmentTitle: String(data.assignmentName || assignment?.title || "Assignment"),
    subject: String(assignment?.subject || data.subject || "General"),
    classId: String(data.classId || assignment?.classId || ""),
    studentId: String(data.studentId || ""),
    studentName: String(data.studentName || data.studentId || "Student"),
    submissionUrl: String(data.submissionUrl || data.fileUrl || ""),
    responseText: String(data.responseText || ""),
    answers: Array.isArray(data.answers) ? data.answers.map((answer) => String(answer)) : [],
    responses: Array.isArray(data.responses)
      ? data.responses.map((response) => {
          const value = asRecord(response);
          return {
            question: String(value.question || ""),
            selected: String(value.selected || value.choiceText || ""),
            ...(typeof value.correct === "boolean" ? { correct: value.correct } : {}),
          };
        })
      : [],
    score: asScore(data.score ?? data.grade),
    feedback: String(data.feedback || ""),
    status: String(data.status || "submitted"),
    submittedAt: asIsoDate(data.submittedAt || data.createdAt),
    pending,
  };
}

function examFromData(id: string, data: Record<string, unknown>): TeacherExamAssessment {
  return {
    id,
    name: String(data.name || "Exam"),
    classId: String(data.classId || ""),
    termId: String(data.termId || ""),
    term: String(data.term || ""),
    academicYear: String(data.academicYear || ""),
    startDate: String(data.startDate || ""),
    endDate: String(data.endDate || ""),
  };
}

function examGradeFromData(id: string, data: Record<string, unknown>, pending = false): TeacherExamGrade {
  return {
    id,
    studentId: String(data.studentId || ""),
    studentName: String(data.studentName || data.studentId || "Student"),
    mark: asScore(data.mark ?? data.score) ?? 0,
    pending,
  };
}

function gradeRecordFromData(id: string, data: Record<string, unknown>, pending = false): TeacherGradeRecord {
  const score = asScore(data.score ?? data.mark ?? data.grade) ?? 0;
  const total = asScore(data.total) ?? 100;
  return {
    id,
    studentId: String(data.studentId || ""),
    studentName: String(data.studentName || data.studentId || "Student"),
    classId: String(data.classId || ""),
    className: String(data.className || data.classId || "Class"),
    subject: String(data.subject || "General"),
    assignmentTitle: String(data.assignmentTitle || ""),
    examName: String(data.examName || ""),
    assessmentType: String(data.assessmentType || (data.examId ? "exam" : "assignment")),
    term: String(data.term || ""),
    academicYear: String(data.academicYear || ""),
    score,
    total,
    feedback: String(data.feedback || ""),
    updatedAt: asIsoDate(data.updatedAt || data.createdAt || data.gradedAt),
    pending,
  };
}

function mergeSubmissionWrites(
  submissions: Map<string, TeacherSubmission>,
  assignments: Map<string, TeacherAssignment>,
  writes: Awaited<ReturnType<typeof getQueuedWrites>>,
  userId: string
) {
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith("submissions/"))
    .forEach((write) => {
      const submissionId = write.path.slice("submissions/".length);
      if (write.type === "delete") {
        submissions.delete(submissionId);
        return;
      }
      const existing = submissions.get(submissionId);
      submissions.set(
        submissionId,
        submissionFromData(
          submissionId,
          { ...(existing || {}), ...(write.data || {}) },
          assignments,
          true
        )
      );
    });
}

export function fetchTeacherClasses(userId: string) {
  return withCache<TeacherClass[]>("teacher-classes", userId, async () => {
    const snapshot = await getDocs(collection(db, "classes"));
    return snapshot.docs
      .map((item) => {
        const value = item.data();
        return {
          id: item.id,
          classId: String(value.classId || item.id),
          name: String(value.name || value.classId || item.id),
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  });
}

export function fetchTeacherAssignments(userId: string) {
  return withCache<TeacherAssignment[]>("teacher-assignments", userId, async () => {
    const [snapshot, queue] = await Promise.all([
      getDocs(query(collection(db, "assignments"), where("teacherId", "==", userId))),
      getQueuedWrites(),
    ]);
    const assignments = new Map(
      snapshot.docs.map((item) => [item.id, assignmentFromData(item.id, item.data())])
    );

    queue
      .filter((write) => write.ownerUid === userId && write.path.startsWith("assignments/"))
      .forEach((write) => {
        const assignmentId = write.path.slice("assignments/".length);
        if (write.type === "delete") {
          assignments.delete(assignmentId);
          return;
        }
        assignments.set(assignmentId, assignmentFromData(assignmentId, write.data || {}, true));
      });

    return [...assignments.values()].sort((left, right) => left.dueDate.localeCompare(right.dueDate));
  });
}

export async function fetchTeacherDashboardSummary(userId: string): Promise<TeacherDashboardSummary> {
  const result = await withCache<Omit<TeacherDashboardSummary, "source">>(
    "teacher-dashboard",
    userId,
    async () => {
      const [assignments, classes, submissions] = await Promise.all([
        fetchTeacherAssignments(userId),
        fetchTeacherClasses(userId),
        getDocs(collection(db, "submissions")),
      ]);
      const assignmentIds = new Set(assignments.data.map((assignment) => assignment.id));
      const matchingSubmissions = submissions.docs
        .map((item) => item.data())
        .filter((submission) => assignmentIds.has(String(submission.assignmentId || "")));

      return {
        assignments: assignments.data.length,
        activeAssignments: assignments.data.filter(
          (assignment) => assignment.dueDate && new Date(assignment.dueDate).getTime() >= Date.now()
        ).length,
        pendingGrading: matchingSubmissions.filter(
          (submission) => String(submission.status || "").toLowerCase() !== "graded"
        ).length,
        classes: classes.data.length,
      };
    }
  );
  return { ...result.data, source: result.source };
}

export async function fetchTeacherSubmissions(userId: string): Promise<TeacherResult<TeacherSubmission[]>> {
  const cacheKey = userId;
  const cached = await readCachedData<TeacherResult<TeacherSubmission[]> | null>(
    "teacher-submissions",
    cacheKey,
    null
  );
  const [assignments, queue] = await Promise.all([
    fetchTeacherAssignments(userId),
    getQueuedWrites(),
  ]);
  const assignmentMap = new Map(assignments.data.map((assignment) => [assignment.id, assignment]));

  try {
    const snapshot = await getDocs(collection(db, "submissions"));
    const submissions = new Map(
      snapshot.docs
        .map((item) => submissionFromData(item.id, item.data(), assignmentMap))
        .filter((submission) => assignmentMap.has(submission.assignmentId))
        .map((submission) => [submission.id, submission])
    );
    mergeSubmissionWrites(submissions, assignmentMap, queue, userId);
    const result: TeacherResult<TeacherSubmission[]> = {
      data: [...submissions.values()].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt)),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData("teacher-submissions", cacheKey, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    const submissions = new Map(cached.data.map((submission) => [submission.id, submission]));
    mergeSubmissionWrites(submissions, assignmentMap, queue, userId);
    return {
      ...cached,
      data: [...submissions.values()].sort((left, right) => right.submittedAt.localeCompare(left.submittedAt)),
      source: "cache",
    };
  }
}

function mergeGradeWrites(
  grades: Map<string, TeacherGradeRecord>,
  writes: Awaited<ReturnType<typeof getQueuedWrites>>,
  userId: string
) {
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith("grades/"))
    .forEach((write) => {
      const gradeId = write.path.slice("grades/".length);
      if (write.type === "delete") {
        grades.delete(gradeId);
        return;
      }
      const existing = grades.get(gradeId);
      grades.set(gradeId, gradeRecordFromData(gradeId, { ...(existing || {}), ...(write.data || {}) }, true));
    });
}

function summarizeGrades(grades: TeacherGradeRecord[]): TeacherGradeSummary {
  const normalized = grades.map((grade) => ({
    ...grade,
    score: grade.total > 0 ? Math.round((grade.score / grade.total) * 100) : grade.score,
  }));
  const average = normalized.length
    ? Math.round(normalized.reduce((total, grade) => total + grade.score, 0) / normalized.length)
    : 0;

  return {
    grades: normalized.sort((left, right) => right.updatedAt.localeCompare(left.updatedAt)),
    average,
    gradedStudents: new Set(normalized.map((grade) => grade.studentId).filter(Boolean)).size,
    subjects: new Set(normalized.map((grade) => grade.subject).filter(Boolean)).size,
  };
}

export async function fetchTeacherGradeSummary(userId: string): Promise<TeacherResult<TeacherGradeSummary>> {
  const cacheKey = userId;
  const cached = await readCachedData<TeacherResult<TeacherGradeSummary> | null>(
    "teacher-grade-summary",
    cacheKey,
    null
  );
  const queue = await getQueuedWrites();

  try {
    const snapshot = await getDocs(query(collection(db, "grades"), where("teacherId", "==", userId)));
    const grades = new Map(
      snapshot.docs.map((item) => [item.id, gradeRecordFromData(item.id, item.data())])
    );
    mergeGradeWrites(grades, queue, userId);
    const result: TeacherResult<TeacherGradeSummary> = {
      data: summarizeGrades([...grades.values()]),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData("teacher-grade-summary", cacheKey, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    const grades = new Map(cached.data.grades.map((grade) => [grade.id, grade]));
    mergeGradeWrites(grades, queue, userId);
    return {
      ...cached,
      data: summarizeGrades([...grades.values()]),
      source: "cache",
    };
  }
}

export function findTeacherSubmission(submissions: TeacherSubmission[], submissionId: string) {
  return submissions.find((submission) => submission.id === submissionId) || null;
}

export function fetchTeacherClassRegister(userId: string, classId: string) {
  return withCache<TeacherClassRegister>("teacher-register", `${userId}:${classId}`, async () => {
    const [students, attendance] = await Promise.all([
      getDocs(query(collection(db, "students"), where("classId", "==", classId))),
      getDocs(query(collection(db, "attendance"), where("classId", "==", classId))),
    ]);
    return {
      students: students.docs
        .map((item) => {
          const student = item.data();
          return {
            studentId: String(student.studentId || item.id),
            studentName: String(student.displayName || student.studentName || student.name || "Student"),
          };
        })
        .sort((left, right) => left.studentName.localeCompare(right.studentName)),
      records: attendance.docs
        .map((item) => {
          const record = item.data();
          const present = typeof record.present === "boolean" ? record.present : record.status === "Present";
          return {
            id: item.id,
            studentId: String(record.studentId || ""),
            studentName: String(record.studentName || "Student"),
            classId: String(record.classId || classId),
            date: String(record.date || ""),
            status: present ? "Present" : "Absent",
          } satisfies TeacherAttendanceRecord;
        })
        .sort((left, right) => right.date.localeCompare(left.date)),
    };
  });
}

export function fetchTeacherExamAssessments(userId: string) {
  return withCache<TeacherExamAssessment[]>("teacher-exams", userId, async () => {
    const snapshot = await getDocs(collection(db, "exams"));
    return snapshot.docs
      .map((item) => examFromData(item.id, item.data()))
      .sort((left, right) => right.startDate.localeCompare(left.startDate));
  });
}

function mergeExamGradeWrites(
  grades: Map<string, TeacherExamGrade>,
  writes: Awaited<ReturnType<typeof getQueuedWrites>>,
  userId: string,
  examId: string,
  subject: string
) {
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith("grades/"))
    .forEach((write) => {
      const gradeId = write.path.slice("grades/".length);
      if (write.type === "delete") {
        grades.delete(gradeId);
        return;
      }
      if (String(write.data?.examId || "") !== examId || String(write.data?.subject || "") !== subject) return;
      grades.set(gradeId, examGradeFromData(gradeId, write.data || {}, true));
    });
}

export async function fetchTeacherExamRegister(
  userId: string,
  exam: TeacherExamAssessment,
  subject: string
): Promise<TeacherResult<TeacherExamRegister>> {
  const cleanSubject = subject.trim();
  const cacheKey = `${userId}:${exam.id}:${cleanSubject.toLowerCase()}`;
  const [cached, queue] = await Promise.all([
    readCachedData<TeacherResult<TeacherExamRegister> | null>("teacher-exam-register", cacheKey, null),
    getQueuedWrites(),
  ]);

  try {
    const [students, grades] = await Promise.all([
      getDocs(query(collection(db, "students"), where("classId", "==", exam.classId))),
      getDocs(query(collection(db, "grades"), where("examId", "==", exam.id), where("subject", "==", cleanSubject))),
    ]);
    const gradeMap = new Map(grades.docs.map((item) => [item.id, examGradeFromData(item.id, item.data())]));
    mergeExamGradeWrites(gradeMap, queue, userId, exam.id, cleanSubject);
    const result: TeacherResult<TeacherExamRegister> = {
      data: {
        students: students.docs
          .map((item) => {
            const student = item.data();
            return {
              studentId: String(student.studentId || item.id),
              studentName: String(student.displayName || student.studentName || student.name || "Student"),
            };
          })
          .sort((left, right) => left.studentName.localeCompare(right.studentName)),
        grades: [...gradeMap.values()].sort((left, right) => left.studentName.localeCompare(right.studentName)),
      },
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData("teacher-exam-register", cacheKey, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    const gradeMap = new Map(cached.data.grades.map((grade) => [grade.id, grade]));
    mergeExamGradeWrites(gradeMap, queue, userId, exam.id, cleanSubject);
    return {
      ...cached,
      data: {
        ...cached.data,
        grades: [...gradeMap.values()].sort((left, right) => left.studentName.localeCompare(right.studentName)),
      },
      source: "cache",
    };
  }
}

function safeId(value: string) {
  return encodeURIComponent(value).replaceAll("%", "_");
}

export function attendanceDocumentId(date: string, classId: string, studentId: string) {
  return `${safeId(date)}_${safeId(classId)}_${safeId(studentId)}`;
}

export function assignmentDocumentId(userId: string) {
  return `${userId}_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function examGradeDocumentId(examId: string, subject: string, studentId: string) {
  return `exam_${examId}_${subject.replace(/[^a-zA-Z0-9]+/g, "_")}_${studentId}`;
}
