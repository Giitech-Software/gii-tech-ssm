import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "africa-south1");
export type TenantRecord = { id: string; tenantId: string; schoolCode?: string; schoolName?: string; contactEmail?: string; phone?: string; status?: string; admin?: { id: string; adminId?: string; displayName?: string; contactEmail?: string; email?: string; userId?: string } | null };
export async function manageTenants<T = unknown>(data: Record<string, unknown>) { return (await httpsCallable<Record<string, unknown>, T>(functions, "manageTenants")(data)).data; }
