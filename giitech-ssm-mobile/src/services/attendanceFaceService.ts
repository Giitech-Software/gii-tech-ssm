import { getFunctions, httpsCallable } from "firebase/functions";
import { TENANT_ID } from "../config/tenant";
import app from "../firebaseConfig";
const functions = getFunctions(app, "africa-south1");
export type FaceVerification = { passed: boolean; schoolId: string; matchConfidence: number; verificationMethod: string };
export async function verifyAttendanceFace(schoolId: string, imageBytes: string) { return (await httpsCallable<{ tenantId: string; schoolId: string; imageBytes: string }, FaceVerification>(functions, "verifyAttendanceFace")({ tenantId: TENANT_ID, schoolId, imageBytes })).data; }
export async function enrollAttendanceFace(schoolId: string, imageBytes: string) { return (await httpsCallable<{ tenantId: string; schoolId: string; imageBytes: string }, { schoolId: string; faceId: string }>(functions, "enrollAttendanceFace")({ tenantId: TENANT_ID, schoolId, imageBytes })).data; }
