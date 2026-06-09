import { collection, getDocs, limit, orderBy, query, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";

export interface ActivityLogRecord {
  id: string;
  userId?: string;
  action: string;
  details?: Record<string, unknown>;
  createdAt?: Timestamp | string;
}

export async function fetchRecentActivityLogs(maximum = 200): Promise<ActivityLogRecord[]> {
  const activityQuery = query(
    collection(db, "activityLogs"),
    orderBy("createdAt", "desc"),
    limit(maximum)
  );
  const snapshot = await getDocs(activityQuery);
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as ActivityLogRecord[];
}
