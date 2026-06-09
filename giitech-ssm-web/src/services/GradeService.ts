import { collection, doc, serverTimestamp, writeBatch } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface GradeAssignmentContext {
  id: string;
  title: string;
  subject?: string;
  classId?: string;
  className?: string;
  academicYear?: string;
  term?: string;
  termId?: string;
}

export interface GradeSubmissionContext {
  id: string;
  studentId: string;
  studentName?: string;
}

export async function saveSubmissionGrade(
  assignment: GradeAssignmentContext,
  submission: GradeSubmissionContext,
  mark: number,
  feedback: string,
  teacherId: string
) {
  if (!Number.isFinite(mark) || mark < 0 || mark > 100) {
    throw new Error("Grade must be a number between 0 and 100.");
  }

  const batch = writeBatch(db);
  const timestamp = serverTimestamp();
  batch.set(
    doc(db, "submissions", submission.id),
    {
      grade: String(mark),
      score: mark,
      feedback: feedback.trim(),
      status: "graded",
      gradedBy: teacherId,
      gradedAt: timestamp,
      updatedAt: timestamp,
    },
    { merge: true }
  );
  batch.set(
    doc(collection(db, "grades"), submission.id),
    {
      submissionId: submission.id,
      assignmentId: assignment.id,
      assignmentTitle: assignment.title,
      studentId: submission.studentId,
      studentName: submission.studentName || "",
      classId: assignment.classId || "",
      className: assignment.className || "",
      subject: assignment.subject || assignment.title,
      academicYear: assignment.academicYear || "",
      term: assignment.term || "",
      termId: assignment.termId || "",
      teacherId,
      mark,
      score: mark,
      total: 100,
      feedback: feedback.trim(),
      updatedAt: timestamp,
    },
    { merge: true }
  );
  await batch.commit();
}

