import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { db } from "../firebaseConfig";

export type FaceEnrollment = { schoolId: string; faceId?: string; enrolledAt?: unknown; enrolledBy?: string };
export type EnrollmentCandidate = { id: string; schoolId: string; name: string; kind: "student" | "staff" };

const functions = getFunctions(undefined, "africa-south1");

export async function enrollAttendanceFace(schoolId: string, imageBytes: string) {
  return (await httpsCallable<{ schoolId: string; imageBytes: string }, { schoolId: string; faceId: string }>(functions, "enrollAttendanceFace")({ schoolId, imageBytes })).data;
}

export async function getFaceEnrollments() {
  const snapshot = await getDocs(collection(db, "attendanceFaceEnrollments"));
  return new Map(snapshot.docs.map(item => [item.id, item.data() as FaceEnrollment]));
}
