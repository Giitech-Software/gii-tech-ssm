import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import type { DocumentPickerAsset } from "expo-document-picker";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { storage } from "../firebaseConfig";
import { queueWrite } from "./syncService";

const UPLOAD_QUEUE_KEY = "giitech-ssm:attachment-upload-queue";
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ACCEPTED_MIME_TYPES =
  /^(application\/pdf|application\/msword|application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document|text\/.*|image\/.*)$/;

export type QueuedAttachmentUpload = {
  id: string;
  ownerUid: string;
  assignmentId: string;
  studentId: string;
  fileName: string;
  contentType: string;
  size: number;
  localUri: string;
  storagePath: string;
  submissionPath: string;
  submissionData: Record<string, unknown>;
  createdAt: string;
  attempts: number;
  lastError?: string;
};

export type AttachmentUploadResult = {
  uploaded: number;
  pending: number;
  failed: number;
};

const activeFlushes = new Map<string, Promise<AttachmentUploadResult>>();

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function safeFileName(value: string) {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "_");
}

async function readQueue(): Promise<QueuedAttachmentUpload[]> {
  const storedQueue = await AsyncStorage.getItem(UPLOAD_QUEUE_KEY);
  if (!storedQueue) return [];

  try {
    return JSON.parse(storedQueue) as QueuedAttachmentUpload[];
  } catch {
    return [];
  }
}

async function saveQueue(queue: QueuedAttachmentUpload[]) {
  await AsyncStorage.setItem(UPLOAD_QUEUE_KEY, JSON.stringify(queue));
}

async function persistPickedFile(asset: DocumentPickerAsset, uploadId: string) {
  if (Platform.OS === "web" || !FileSystem.documentDirectory) return asset.uri;

  const uploadDirectory = `${FileSystem.documentDirectory}queued-attachments/`;
  await FileSystem.makeDirectoryAsync(uploadDirectory, { intermediates: true });
  const destination = `${uploadDirectory}${uploadId}-${safeFileName(asset.name)}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destination });
  return destination;
}

async function removePersistedFile(localUri: string) {
  if (Platform.OS === "web" || !localUri.startsWith(FileSystem.documentDirectory || "")) return;
  await FileSystem.deleteAsync(localUri, { idempotent: true });
}

export function validatePickedAttachment(asset: DocumentPickerAsset) {
  const contentType = asset.mimeType || "application/octet-stream";
  if (!asset.size || asset.size >= MAX_FILE_SIZE) {
    throw new Error("Choose a file smaller than 10 MB.");
  }
  if (!ACCEPTED_MIME_TYPES.test(contentType)) {
    throw new Error("Choose a PDF, Word document, text file, or image.");
  }
}

export async function getAttachmentUploadCount(ownerUid: string) {
  return (await readQueue()).filter((upload) => upload.ownerUid === ownerUid).length;
}

export async function queueAttachmentUpload(input: {
  asset: DocumentPickerAsset;
  ownerUid: string;
  assignmentId: string;
  studentId: string;
  submissionPath: string;
  submissionData: Record<string, unknown>;
}) {
  validatePickedAttachment(input.asset);
  const uploadId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const fileName = safeFileName(input.asset.name);
  const upload: QueuedAttachmentUpload = {
    id: uploadId,
    ownerUid: input.ownerUid,
    assignmentId: input.assignmentId,
    studentId: input.studentId,
    fileName,
    contentType: input.asset.mimeType || "application/octet-stream",
    size: input.asset.size || 0,
    localUri: await persistPickedFile(input.asset, uploadId),
    storagePath: `submissions/${input.studentId}/${uploadId}-${fileName}`,
    submissionPath: input.submissionPath,
    submissionData: input.submissionData,
    createdAt: new Date().toISOString(),
    attempts: 0,
  };
  const queue = await readQueue();
  const retainedUploads = queue.filter(
    (queued) =>
      queued.ownerUid !== upload.ownerUid ||
      queued.assignmentId !== upload.assignmentId
  );
  await Promise.all(
    queue
      .filter((queued) => !retainedUploads.includes(queued))
      .map((queued) => removePersistedFile(queued.localUri))
  );
  await saveQueue([...retainedUploads, upload]);
  return upload;
}

async function uploadAttachment(upload: QueuedAttachmentUpload) {
  const response = await fetch(upload.localUri);
  if (!response.ok) throw new Error("The selected file is no longer available on this device.");
  const blob = await response.blob();
  const storageReference = ref(storage, upload.storagePath);
  await uploadBytes(storageReference, blob, { contentType: upload.contentType });
  const submissionUrl = await getDownloadURL(storageReference);
  await queueWrite({
    ownerUid: upload.ownerUid,
    path: upload.submissionPath,
    type: "set",
    merge: true,
    data: { ...upload.submissionData, submissionUrl },
  });
}

async function flushUploadsForUser(ownerUid: string): Promise<AttachmentUploadResult> {
  const queue = await readQueue();
  const ownedUploads = queue.filter((upload) => upload.ownerUid === ownerUid);
  const otherUsersUploads = queue.filter((upload) => upload.ownerUid !== ownerUid);
  const remaining: QueuedAttachmentUpload[] = [];
  const uploadedFiles: string[] = [];
  let uploaded = 0;

  for (const upload of ownedUploads) {
    try {
      await uploadAttachment(upload);
      uploadedFiles.push(upload.localUri);
      uploaded += 1;
    } catch (error) {
      remaining.push({
        ...upload,
        attempts: upload.attempts + 1,
        lastError: errorMessage(error),
      });
    }
  }

  await saveQueue([...otherUsersUploads, ...remaining]);
  await Promise.all(uploadedFiles.map(removePersistedFile));
  return { uploaded, pending: remaining.length, failed: remaining.length };
}

export async function flushAttachmentUploads(ownerUid: string) {
  const activeFlush = activeFlushes.get(ownerUid);
  if (activeFlush) return activeFlush;

  const flush = flushUploadsForUser(ownerUid).finally(() => {
    activeFlushes.delete(ownerUid);
  });
  activeFlushes.set(ownerUid, flush);
  return flush;
}
