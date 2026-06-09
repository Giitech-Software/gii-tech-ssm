import { collection, getDocs } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../firebaseConfig";
import { readCachedData, writeCachedData } from "./offlineStore";

export type ManagedAccountRole = "admin" | "teacher" | "student" | "parent";

export type ManagedAccount = {
  uid: string;
  id: string;
  displayName: string;
  email: string;
  role: string;
  createdAt: string;
};

export type AccountDirectory = {
  accounts: ManagedAccount[];
  loadedAt: string;
  source: "live" | "cache";
};

export type CreateManagedAccountInput = {
  id?: string;
  displayName: string;
  password: string;
  role: ManagedAccountRole;
  extra?: Record<string, unknown>;
};

const functions = getFunctions(app, "africa-south1");

function asIsoDate(value: unknown) {
  if (!value) return "";
  if (typeof value === "object" && value !== null && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? "" : parsed.toISOString();
}

function accountFromData(uid: string, data: Record<string, unknown>): ManagedAccount {
  return {
    uid,
    id: String(data.id || uid),
    displayName: String(data.displayName || data.id || "School member"),
    email: String(data.email || ""),
    role: String(data.role || ""),
    createdAt: asIsoDate(data.createdAt),
  };
}

function callableError(error: unknown, fallback: string) {
  if (error instanceof Error) return new Error(error.message.replace(/^FirebaseError:\s*/, ""));
  return new Error(fallback);
}

export async function fetchManagedAccounts(userId: string): Promise<AccountDirectory> {
  const cached = await readCachedData<AccountDirectory | null>("superadmin-accounts", userId, null);
  try {
    const snapshot = await getDocs(collection(db, "users"));
    const result: AccountDirectory = {
      accounts: snapshot.docs
        .map((item) => accountFromData(item.id, item.data()))
        .sort((left, right) => left.displayName.localeCompare(right.displayName)),
      loadedAt: new Date().toISOString(),
      source: "live",
    };
    await writeCachedData("superadmin-accounts", userId, result);
    return result;
  } catch (error) {
    if (cached) return { ...cached, source: "cache" };
    throw error;
  }
}

export async function createManagedAccount(input: CreateManagedAccountInput) {
  try {
    const create = httpsCallable<CreateManagedAccountInput, ManagedAccount>(functions, "createManagedUser");
    return (await create(input)).data;
  } catch (error) {
    throw callableError(error, "Unable to create this account.");
  }
}

export async function updateManagedAccountRole(uid: string, role: ManagedAccountRole) {
  try {
    const update = httpsCallable<{ uid: string; role: ManagedAccountRole }, { uid: string; id: string; role: ManagedAccountRole }>(functions, "updateManagedUserRole");
    return (await update({ uid, role })).data;
  } catch (error) {
    throw callableError(error, "Unable to update this account role.");
  }
}

export async function deleteManagedAccount(uid: string) {
  try {
    const remove = httpsCallable<{ uid: string }, { uid: string }>(functions, "deleteManagedUser");
    return (await remove({ uid })).data;
  } catch (error) {
    throw callableError(error, "Unable to delete this account.");
  }
}
