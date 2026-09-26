import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig";

const functions = getFunctions(app, "africa-south1");
export async function backfillAstemTenant() {
  return (await httpsCallable<undefined, { tenantId: string; updated: number }>(functions, "backfillAstemTenant")(undefined)).data;
}
