import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";

const region = "africa-south1";
const accountRoles = ["admin", "teacher", "student", "parent"] as const;
type AccountRole = (typeof accountRoles)[number];

const prefixes: Record<AccountRole, string> = {
  admin: "ADM",
  teacher: "TEA",
  student: "STU",
  parent: "PAR",
};

const profileCollections: Record<AccountRole, string> = {
  admin: "admins",
  teacher: "teachers",
  student: "students",
  parent: "parents",
};

function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}

function asRole(value: unknown): AccountRole {
  const role = String(value || "").toLowerCase();
  if (!accountRoles.includes(role as AccountRole)) {
    throw new HttpsError("invalid-argument", "Choose a valid account role.");
  }
  return role as AccountRole;
}

function cleanId(value: unknown) {
  const id = String(value || "").trim().toUpperCase();
  if (id && !/^[A-Z0-9_-]+$/.test(id)) {
    throw new HttpsError("invalid-argument", "User IDs may only contain letters, numbers, hyphens, and underscores.");
  }
  return id;
}

function idToEmail(id: string) {
  return `${id.toLowerCase()}@giitech-ssm.com`;
}

async function assertSuperAdmin(uid?: string) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in is required.");
  const profile = await getFirestore().collection("users").doc(uid).get();
  if (String(profile.data()?.role || "").toLowerCase() !== "superadmin") {
    throw new HttpsError("permission-denied", "Super-admin access is required.");
  }
}

async function generateAccountId(role: AccountRole) {
  const db = getFirestore();
  const prefix = prefixes[role];
  return db.runTransaction(async (transaction) => {
    const reference = db.collection("counters").doc(prefix);
    const snapshot = await transaction.get(reference);
    const next = Number(snapshot.data()?.last || 0) + 1;
    transaction.set(reference, { last: next }, { merge: true });
    return `${prefix}${String(next).padStart(3, "0")}`;
  });
}

function profileData(role: AccountRole, id: string, uid: string, displayName: string, email: string, extra: Record<string, unknown>) {
  const base = { userId: uid, displayName, email, updatedAt: FieldValue.serverTimestamp() };
  if (role === "student") {
    return { ...base, studentId: id, classId: String(extra.classId || ""), streamId: String(extra.streamId || ""), stream: String(extra.streamId || ""), parentId: String(extra.parentId || ""), status: "active" };
  }
  if (role === "teacher") {
    return { ...base, teacherId: id, departmentId: String(extra.departmentId || ""), department: String(extra.departmentId || ""), subject: String(extra.subject || ""), status: "active" };
  }
  if (role === "parent") {
    return { ...base, parentId: id, studentIds: Array.isArray(extra.studentIds) ? extra.studentIds.map(String) : [] };
  }
  return { ...base, adminId: id };
}

export const createManagedUser = onCall({ region }, async (request) => {
  await assertSuperAdmin(request.auth?.uid);
  const data = asRecord(request.data);
  const role = asRole(data.role);
  const displayName = String(data.displayName || "").trim();
  const password = String(data.password || "");
  if (!displayName) throw new HttpsError("invalid-argument", "Display name is required.");
  if (password.length < 6) throw new HttpsError("invalid-argument", "Password must contain at least 6 characters.");

  const db = getFirestore();
  const id = cleanId(data.id) || await generateAccountId(role);
  const duplicate = await db.collection("users").where("id", "==", id).limit(1).get();
  if (!duplicate.empty) throw new HttpsError("already-exists", `User ID "${id}" already exists.`);

  const email = idToEmail(id);
  const auth = getAuth();
  const created = await auth.createUser({ email, password, displayName });
  try {
    const batch = db.batch();
    batch.set(db.collection("users").doc(created.uid), {
      uid: created.uid,
      id,
      role,
      email,
      displayName,
      createdAt: FieldValue.serverTimestamp(),
    });
    batch.set(db.collection(profileCollections[role]).doc(id), {
      ...profileData(role, id, created.uid, displayName, email, asRecord(data.extra)),
      createdAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    await auth.deleteUser(created.uid).catch(() => undefined);
    throw error;
  }
  return { uid: created.uid, id, role, email, displayName };
});

export const updateManagedUserRole = onCall({ region }, async (request) => {
  await assertSuperAdmin(request.auth?.uid);
  const data = asRecord(request.data);
  const uid = String(data.uid || "");
  const role = asRole(data.role);
  if (!uid) throw new HttpsError("invalid-argument", "Choose an account to update.");

  const db = getFirestore();
  const reference = db.collection("users").doc(uid);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "The account profile no longer exists.");
  const current = snapshot.data() || {};
  const oldRole = String(current.role || "").toLowerCase();
  if (oldRole === "superadmin") throw new HttpsError("failed-precondition", "Super-admin roles cannot be changed here.");
  const id = String(current.id || "").trim();
  const displayName = String(current.displayName || "School member");
  const email = String(current.email || idToEmail(id));

  const batch = db.batch();
  batch.update(reference, { role, updatedAt: FieldValue.serverTimestamp() });
  batch.set(db.collection(profileCollections[role]).doc(id), profileData(role, id, uid, displayName, email, asRecord(data.extra)), { merge: true });
  await batch.commit();
  return { uid, id, role };
});

export const deleteManagedUser = onCall({ region }, async (request) => {
  await assertSuperAdmin(request.auth?.uid);
  const uid = String(asRecord(request.data).uid || "");
  if (!uid) throw new HttpsError("invalid-argument", "Choose an account to delete.");
  if (uid === request.auth?.uid) throw new HttpsError("failed-precondition", "You cannot delete your own signed-in account.");

  const db = getFirestore();
  const reference = db.collection("users").doc(uid);
  const snapshot = await reference.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "The account profile no longer exists.");
  const profile = snapshot.data() || {};
  const role = String(profile.role || "").toLowerCase();
  if (role === "superadmin") throw new HttpsError("failed-precondition", "Super-admin accounts cannot be deleted here.");

  await getAuth().deleteUser(uid);
  const batch = db.batch();
  batch.delete(reference);
  if (accountRoles.includes(role as AccountRole)) {
    batch.set(
      db.collection(profileCollections[role as AccountRole]).doc(String(profile.id || "")),
      { loginDisabled: true, status: "archived", updatedAt: FieldValue.serverTimestamp() },
      { merge: true },
    );
  }
  await batch.commit();
  return { uid };
});
