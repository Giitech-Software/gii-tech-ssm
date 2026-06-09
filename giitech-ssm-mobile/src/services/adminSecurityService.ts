import { collection, getDocs } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { getQueuedWrites, readCachedData, writeCachedData } from "./offlineStore";

const CACHE_SCOPE = "admin-security";

export type ActivityLogRecord = {
  id: string;
  userId: string;
  action: string;
  details: Record<string, unknown>;
  createdAt?: unknown;
  pending: boolean;
};

export type AdminSecurityData = {
  logs: ActivityLogRecord[];
  loadedAt: string;
  source: "live" | "cache";
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? value as Record<string, unknown> : {};
}

function logFromData(id: string, data: Record<string, unknown>, pending = false): ActivityLogRecord {
  return {
    id,
    userId: String(data.userId || ""),
    action: String(data.action || "unknown_activity"),
    details: asRecord(data.details),
    createdAt: data.createdAt,
    pending,
  };
}

function overlayLogs(logs: ActivityLogRecord[], writes: Awaited<ReturnType<typeof getQueuedWrites>>, userId: string) {
  const values = new Map(logs.map((item) => [item.id, item]));
  writes
    .filter((write) => write.ownerUid === userId && write.path.startsWith("activityLogs/"))
    .forEach((write) => {
      const id = write.path.slice("activityLogs/".length);
      if (write.type === "delete") values.delete(id);
      else values.set(id, logFromData(id, { ...(values.get(id) || {}), ...(write.data || {}) }, true));
    });
  return [...values.values()].sort((left, right) => millis(right.createdAt) - millis(left.createdAt));
}

function millis(value: unknown) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const timestamp = value as { seconds?: number; toDate?: () => Date };
  if (typeof timestamp.toDate === "function") return timestamp.toDate().getTime();
  if (typeof timestamp.seconds === "number") return timestamp.seconds * 1000;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

export function formatActivityDate(value: unknown) {
  const time = millis(value);
  return time ? new Date(time).toLocaleString() : "Pending sync";
}

export function activityDetails(details: Record<string, unknown>) {
  const entries = Object.entries(details).slice(0, 4);
  return entries.length ? entries.map(([key, value]) => `${key}: ${String(value)}`).join(" | ") : "No additional details";
}

export async function fetchAdminSecurity(userId: string): Promise<AdminSecurityData> {
  const cached = await readCachedData<AdminSecurityData | null>(CACHE_SCOPE, userId, null);
  const writes = await getQueuedWrites();
  try {
    const snapshot = await getDocs(collection(db, "activityLogs"));
    const result: AdminSecurityData = {
      logs: overlayLogs(snapshot.docs.map((item) => logFromData(item.id, item.data())), writes, userId),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData(CACHE_SCOPE, userId, result);
    return result;
  } catch (error) {
    if (!cached) throw error;
    return { ...cached, logs: overlayLogs(cached.logs, writes, userId), source: "cache" };
  }
}

export function activityLogDocumentId() {
  return `ACT-M-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
}

export function studentIdentityPayload(studentId: string) {
  return JSON.stringify({ app: "giitech-ssm", type: "student-identity", version: 1, studentId });
}
