import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig";
const functions = getFunctions(app, "africa-south1");
export type FaceVerification = { passed: boolean; schoolId: string; matchConfidence: number; verificationMethod: string };
export async function verifyAttendanceFace(schoolId: string, imageBytes: string) { return (await httpsCallable<{ schoolId: string; imageBytes: string }, FaceVerification>(functions, "verifyAttendanceFace")({ schoolId, imageBytes })).data; }
