import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_PREFIX = "giitech-ssm:cache:";
const QUEUE_KEY = "giitech-ssm:sync-queue";

export type QueuedWrite = {
  id: string;
  ownerUid: string;
  path: string;
  type: "set" | "delete";
  data?: Record<string, unknown>;
  merge?: boolean;
  serverTimestampFields?: string[];
  createdAt: string;
  attempts: number;
  lastError?: string;
};

function cacheKey(scope: string, key: string) {
  return `${CACHE_PREFIX}${scope}:${key}`;
}

async function readJson<T>(key: string, fallback: T): Promise<T> {
  const storedValue = await AsyncStorage.getItem(key);
  if (!storedValue) return fallback;

  try {
    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

export async function readCachedData<T>(
  scope: string,
  key: string,
  fallback: T
): Promise<T> {
  return readJson(cacheKey(scope, key), fallback);
}

export async function writeCachedData<T>(
  scope: string,
  key: string,
  value: T
): Promise<void> {
  await AsyncStorage.setItem(cacheKey(scope, key), JSON.stringify(value));
}

export async function removeCachedData(scope: string, key: string): Promise<void> {
  await AsyncStorage.removeItem(cacheKey(scope, key));
}

export async function getQueuedWrites(): Promise<QueuedWrite[]> {
  return readJson<QueuedWrite[]>(QUEUE_KEY, []);
}

export async function saveQueuedWrites(queue: QueuedWrite[]): Promise<void> {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function addQueuedWrite(
  write: Omit<QueuedWrite, "id" | "createdAt" | "attempts">
): Promise<QueuedWrite> {
  const queuedWrite: QueuedWrite = {
    ...write,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  const queue = await getQueuedWrites();
  const retainedWrites = queue.filter(
    (queued) =>
      queued.ownerUid !== queuedWrite.ownerUid ||
      queued.path !== queuedWrite.path
  );
  await saveQueuedWrites([...retainedWrites, queuedWrite]);
  return queuedWrite;
}
