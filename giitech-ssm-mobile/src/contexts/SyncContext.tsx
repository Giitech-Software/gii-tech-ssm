import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AppState } from "react-native";
import { useAuth } from "./AuthContext";
import { getQueuedWrites } from "../services/offlineStore";
import {
  flushAttachmentUploads,
  getAttachmentUploadCount,
  queueAttachmentUpload as persistAttachmentUpload,
} from "../services/attachmentUploadService";
import {
  flushQueuedWrites,
  queueWrite as persistQueuedWrite,
  type QueueWriteInput,
  type SyncResult,
} from "../services/syncService";

type SyncStatus = "idle" | "syncing" | "pending";
type UserQueueWriteInput = Omit<QueueWriteInput, "ownerUid">;
type UserAttachmentUploadInput = Omit<
  Parameters<typeof persistAttachmentUpload>[0],
  "ownerUid"
>;

type SyncContextValue = {
  status: SyncStatus;
  pendingCount: number;
  lastSyncedAt: string | null;
  queueWrite: (input: UserQueueWriteInput) => Promise<"synced" | "pending">;
  queueAttachmentUpload: (input: UserAttachmentUploadInput) => Promise<"synced" | "pending">;
  syncNow: () => Promise<SyncResult | null>;
};

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

export function SyncProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [pendingCount, setPendingCount] = useState(0);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const refreshPendingCount = useCallback(async () => {
    const queue = await getQueuedWrites();
    if (!user) {
      setPendingCount(0);
      return;
    }
    const writeCount = queue.filter((write) => write.ownerUid === user.uid).length;
    setPendingCount(writeCount + (await getAttachmentUploadCount(user.uid)));
  }, [user]);

  const syncNow = useCallback(async () => {
    if (!user) return null;

    setStatus("syncing");
    const uploadResult = await flushAttachmentUploads(user.uid);
    const writeResult = await flushQueuedWrites(user.uid);
    const result = {
      synced: uploadResult.uploaded + writeResult.synced,
      pending: uploadResult.pending + writeResult.pending,
      failed: uploadResult.failed + writeResult.failed,
    };
    setPendingCount(result.pending);

    if (result.failed > 0) {
      setStatus("pending");
      return result;
    }

    setStatus("idle");
    setLastSyncedAt(new Date().toISOString());
    return result;
  }, [user]);

  const queueWrite = useCallback(
    async (input: UserQueueWriteInput) => {
      if (!user) throw new Error("Sign in before saving offline changes.");
      await persistQueuedWrite({ ...input, ownerUid: user.uid });
      await refreshPendingCount();
      const result = await syncNow();
      return result && result.pending === 0 ? "synced" : "pending";
    },
    [refreshPendingCount, syncNow, user]
  );

  const queueAttachmentUpload = useCallback(
    async (input: UserAttachmentUploadInput) => {
      if (!user) throw new Error("Sign in before saving offline attachments.");
      await persistAttachmentUpload({ ...input, ownerUid: user.uid });
      await refreshPendingCount();
      const result = await syncNow();
      return result && result.pending === 0 ? "synced" : "pending";
    },
    [refreshPendingCount, syncNow, user]
  );

  useEffect(() => {
    refreshPendingCount();
  }, [refreshPendingCount]);

  useEffect(() => {
    if (!user) {
      setStatus("idle");
      return;
    }

    syncNow();
    const interval = setInterval(syncNow, 30000);
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") syncNow();
    });

    return () => {
      clearInterval(interval);
      subscription.remove();
    };
  }, [syncNow, user]);

  const value = useMemo(
    () => ({ status, pendingCount, lastSyncedAt, queueWrite, queueAttachmentUpload, syncNow }),
    [lastSyncedAt, pendingCount, queueAttachmentUpload, queueWrite, status, syncNow]
  );

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) throw new Error("useSync must be used within SyncProvider");
  return context;
}
