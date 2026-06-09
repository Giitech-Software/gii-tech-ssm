import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebaseConfig";

export interface EscalationSyncResult {
  active: number;
  resolved: number;
}

export async function syncWorkflowEscalations(): Promise<EscalationSyncResult> {
  const functions = getFunctions(app, "africa-south1");
  const sync = httpsCallable<void, EscalationSyncResult>(functions, "syncWorkflowEscalations");
  return (await sync()).data;
}
