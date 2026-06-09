import { readCachedData, removeCachedData, writeCachedData } from "./offlineStore";
import { fetchStudentProfile, type StudentAssignment } from "./studentDetailService";

const DRAFT_SCOPE = "student-submission-draft";

export type StudentSubmissionDraft = {
  assignmentId: string;
  responseText: string;
  questionResponses: Record<string, string>;
  updatedAt: string;
};

export type StudentAssessmentResponse = {
  question: string;
  selected: string;
  correct: boolean;
};

export type StudentSubmissionContext = {
  studentId: string;
  classId: string;
  studentName: string;
};

export function submissionDocumentId(studentUid: string, assignmentId: string) {
  return `${studentUid}_${assignmentId}`;
}

function draftKey(userId: string, assignmentId: string) {
  return `${userId}:${assignmentId}`;
}

export function readSubmissionDraft(userId: string, assignmentId: string) {
  return readCachedData<StudentSubmissionDraft | null>(
    DRAFT_SCOPE,
    draftKey(userId, assignmentId),
    null
  );
}

export function saveSubmissionDraft(
  userId: string,
  assignmentId: string,
  responseText: string,
  questionResponses: Record<string, string>
) {
  return writeCachedData<StudentSubmissionDraft>(DRAFT_SCOPE, draftKey(userId, assignmentId), {
    assignmentId,
    responseText,
    questionResponses,
    updatedAt: new Date().toISOString(),
  });
}

export function clearSubmissionDraft(userId: string, assignmentId: string) {
  return removeCachedData(DRAFT_SCOPE, draftKey(userId, assignmentId));
}

export function findCachedAssignment(assignments: StudentAssignment[], assignmentId: string) {
  return assignments.find((assignment) => assignment.id === assignmentId) || null;
}

export async function fetchStudentSubmissionContext(
  userId: string
): Promise<StudentSubmissionContext> {
  return fetchStudentProfile(userId);
}
