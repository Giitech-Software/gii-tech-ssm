import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { db } from "../firebaseConfig";
import { calculateFinalScore, getGradingConfiguration } from "./GradingConfigurationService";

export interface AcademicTerm {
  id: string;
  name: string;
  academicYear: string;
  startDate: string;
  endDate: string;
  status: "planned" | "active" | "closed";
}

export interface ExamAssessment {
  id: string;
  name: string;
  classId: string;
  termId: string;
  term: string;
  academicYear: string;
  startDate: string;
  endDate?: string;
}

export interface AssessmentStudent {
  id: string;
  studentId: string;
  displayName: string;
}

export interface ExamGradeEntry {
  studentId: string;
  studentName: string;
  mark: number;
  classScore?: number;
  examScore?: number;
}

export async function fetchTerms(): Promise<AcademicTerm[]> {
  const snapshot = await getDocs(collection(db, "terms"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as AcademicTerm)
    .sort((left, right) => right.startDate.localeCompare(left.startDate));
}

export async function createTerm(term: Omit<AcademicTerm, "id">) {
  return addDoc(collection(db, "terms"), { ...term, createdAt: serverTimestamp() });
}

export async function deleteTerm(id: string) {
  await deleteDoc(doc(db, "terms", id));
}

export async function fetchExamAssessments(): Promise<ExamAssessment[]> {
  const snapshot = await getDocs(collection(db, "exams"));
  return snapshot.docs
    .map((item) => ({ id: item.id, ...item.data() }) as ExamAssessment)
    .sort((left, right) => right.startDate.localeCompare(left.startDate));
}

export async function createExamAssessment(exam: Omit<ExamAssessment, "id">) {
  return addDoc(collection(db, "exams"), { ...exam, createdAt: serverTimestamp() });
}

export async function deleteExamAssessment(id: string) {
  await deleteDoc(doc(db, "exams", id));
}

export async function fetchAssessmentStudents(classId: string): Promise<AssessmentStudent[]> {
  const studentQuery = query(collection(db, "students"), where("classId", "==", classId));
  const snapshot = await getDocs(studentQuery);
  return snapshot.docs
    .map((item) => {
      const data = item.data();
      return {
        id: item.id,
        studentId: data.studentId || item.id,
        displayName: data.displayName || data.studentName || data.name || "Student",
      };
    })
    .sort((left, right) => left.displayName.localeCompare(right.displayName));
}

export async function fetchExamGradeEntries(examId: string, subject: string) {
  const gradeQuery = query(
    collection(db, "grades"),
    where("examId", "==", examId),
    where("subject", "==", subject)
  );
  const snapshot = await getDocs(gradeQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as Array<ExamGradeEntry & { id: string }>;
}

const gradeId = (examId: string, subject: string, studentId: string) =>
  `exam_${examId}_${subject.replace(/[^a-zA-Z0-9]+/g, "_")}_${studentId}`;

export async function saveExamGrades(
  exam: ExamAssessment,
  subject: string,
  entries: ExamGradeEntry[],
  teacherId: string
) {
  const cleanSubject = subject.trim();
  if (!cleanSubject) throw new Error("Subject is required.");
  if (entries.some((entry) => !Number.isFinite(entry.mark) || entry.mark < 0 || entry.mark > 100 || (entry.classScore != null && (!Number.isFinite(entry.classScore) || entry.classScore < 0 || entry.classScore > 100)) || (entry.examScore != null && (!Number.isFinite(entry.examScore) || entry.examScore < 0 || entry.examScore > 100)))) {
    throw new Error("Every mark must be between 0 and 100.");
  }

  const batch = writeBatch(db);
  const gradingConfiguration = await getGradingConfiguration();
  entries.forEach((entry) => {
    batch.set(
      doc(db, "grades", gradeId(exam.id, cleanSubject, entry.studentId)),
      {
        assessmentType: "exam",
        examId: exam.id,
        examName: exam.name,
        studentId: entry.studentId,
        studentName: entry.studentName,
        classId: exam.classId,
        subject: cleanSubject,
        academicYear: exam.academicYear,
        termId: exam.termId,
        term: exam.term,
        teacherId,
        mark: entry.mark,
        score: entry.mark,
        classScore: entry.classScore,
        examScore: entry.examScore,
        finalScore: calculateFinalScore(entry.classScore, entry.examScore, gradingConfiguration),
        total: 100,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
  await batch.commit();
}
