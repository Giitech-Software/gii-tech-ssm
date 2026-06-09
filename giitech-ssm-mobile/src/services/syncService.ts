import { deleteDoc, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";
import {
  addQueuedWrite,
  getQueuedWrites,
  saveQueuedWrites,
  type QueuedWrite,
} from "./offlineStore";

export type QueueWriteInput = Omit<QueuedWrite, "id" | "createdAt" | "attempts">;

export type SyncResult = {
  synced: number;
  pending: number;
  failed: number;
};

const activeFlushes = new Map<string, Promise<SyncResult>>();

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function applyWrite(write: QueuedWrite) {
  const reference = doc(db, write.path);

  if (write.type === "delete") {
    await deleteDoc(reference);
    return;
  }

  const data = { ...(write.data || {}) };
  write.serverTimestampFields?.forEach((field) => {
    data[field] = serverTimestamp();
  });
  await setDoc(reference, data, { merge: write.merge ?? true });
}

export async function queueWrite(input: QueueWriteInput): Promise<QueuedWrite> {
  return addQueuedWrite(input);
}

async function flushWritesForUser(ownerUid: string): Promise<SyncResult> {
  const queue = await getQueuedWrites();
  const ownedWrites = queue.filter((write) => write.ownerUid === ownerUid);
  const otherUsersWrites = queue.filter((write) => write.ownerUid !== ownerUid);
  const remaining: QueuedWrite[] = [];
  let synced = 0;

  for (const write of ownedWrites) {
    try {
      await applyWrite(write);
      synced += 1;
    } catch (error) {
      remaining.push({
        ...write,
        attempts: write.attempts + 1,
        lastError: errorMessage(error),
      });
    }
  }

  await saveQueuedWrites([...otherUsersWrites, ...remaining]);
  return {
    synced,
    pending: remaining.length,
    failed: remaining.length,
  };
}

export async function flushQueuedWrites(ownerUid: string): Promise<SyncResult> {
  const activeFlush = activeFlushes.get(ownerUid);
  if (activeFlush) return activeFlush;

  const flush = flushWritesForUser(ownerUid).finally(() => {
    activeFlushes.delete(ownerUid);
  });
  activeFlushes.set(ownerUid, flush);
  return flush;
}
