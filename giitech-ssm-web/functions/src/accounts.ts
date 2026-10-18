import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";
import { google } from "googleapis";

const twilioAccountSid = defineSecret("TWILIO_ACCOUNT_SID");
const twilioAuthToken = defineSecret("TWILIO_AUTH_TOKEN");
const twilioSmsFrom = defineSecret("TWILIO_SMS_FROM");
const gmailClientId = defineSecret("GMAIL_CLIENT_ID");
const gmailClientSecret = defineSecret("GMAIL_CLIENT_SECRET");
const gmailRefreshToken = defineSecret("GMAIL_REFRESH_TOKEN");
const gmailSender = "giitechsoftems@gmail.com";
const TENANT_ID = "astem-ssm-001";

const region = "africa-south1";
const accountRoles = ["admin", "teacher", "student", "parent", "staff"] as const;
type AccountRole = (typeof accountRoles)[number];

const prefixes: Record<AccountRole, string> = {
  admin: "ADM",
  teacher: "TEA",
  student: "STU",
  parent: "PAR",
  staff: "STF",
};

const profileCollections: Record<AccountRole, string> = {
  admin: "admins",
  teacher: "teachers",
  student: "students",
  parent: "parents",
  staff: "staff",
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

function cleanTenantId(value: unknown) {
  const id = String(value || "").trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  if (!id || id.length < 3 || id.length > 40) throw new HttpsError("invalid-argument", "School code must be 3 to 40 letters or numbers.");
  return id;
}

function idToEmail(id: string) {
  return `${id.toLowerCase()}@giitech-ssm.com`;
}

async function sendCredentialSms(phone: string, id: string, password: string) {
  const compact = phone.trim().replace(/[\s().-]/g, "");
  const normalized = compact.startsWith("0") ? `+233${compact.slice(1)}` : compact;
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return "no-phone";
  if (!twilioAccountSid.value() || !twilioAuthToken.value() || !twilioSmsFrom.value()) return "not-configured";
  const body = `ASTEM-SSM account approved. Login ID: ${id}. Temporary password: ${password}. Sign in and reset your password after first login.`;
  const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid.value()}/Messages.json`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${twilioAccountSid.value()}:${twilioAuthToken.value()}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ To: normalized, From: twilioSmsFrom.value(), Body: body }) });
  if (!response.ok) throw new Error(`SMS delivery failed with status ${response.status}.`);
  return "sent";
}

async function sendCredentialEmail(to: string, id: string, password: string) {
  if (!to || !gmailClientId.value() || !gmailClientSecret.value() || !gmailRefreshToken.value()) return "not-configured";
  const authClient = new google.auth.OAuth2(gmailClientId.value(), gmailClientSecret.value());
  authClient.setCredentials({ refresh_token: gmailRefreshToken.value() });
  const gmail = google.gmail({ version: "v1", auth: authClient });
  const body = [`From: ${gmailSender}`, `To: ${to}`, "Subject: Your ASTEM-SSM account has been approved", "Content-Type: text/plain; charset=utf-8", "", "Your account has been approved.", `Login ID: ${id}`, `Temporary password: ${password}`, "Please sign in and reset your password after your first login."].join("\r\n");
  await gmail.users.messages.send({ userId: "me", requestBody: { raw: Buffer.from(body).toString("base64url") } });
  return "sent";
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
    return { ...base, parentId: id, phone: String(extra.phone || ""), contactEmail: String(extra.contactEmail || ""), studentIds: Array.isArray(extra.studentIds) ? extra.studentIds.map(String) : [] };
  }
  if (role === "staff") return { ...base, staffId: id, departmentId: String(extra.departmentId || ""), department: String(extra.departmentId || ""), phone: String(extra.phone || ""), status: "active" };
  return { ...base, adminId: id };
}

const signupRoles = ["parent", "teacher", "student", "staff"] as const;
function signupRole(value: unknown): AccountRole {
  const role = String(value || "").toLowerCase();
  if (!signupRoles.includes(role as (typeof signupRoles)[number])) throw new HttpsError("invalid-argument", "Choose a valid signup role.");
  return role as AccountRole;
}

export const submitSignupRequest = onCall({ region }, async (request) => {
  const data = asRecord(request.data);
  const role = signupRole(data.role);
  const displayName = String(data.displayName || "").trim();
  const phone = String(data.phone || "").trim();
  const email = String(data.email || "").trim().toLowerCase();
  if (!displayName) throw new HttpsError("invalid-argument", "Full name is required.");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpsError("invalid-argument", "A valid email address is required.");
  if (role !== "student" && !phone) throw new HttpsError("invalid-argument", "Phone number is required.");
  const db = getFirestore();
  const reference = db.collection("signupRequests").doc();
  await reference.set({
    requestId: reference.id,
    tenantId: TENANT_ID,
    role,
    displayName,
    phone,
    email,
    extra: asRecord(data.extra),
    status: "pending",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return { requestId: reference.id, status: "pending" };
});

export const fetchSignupOptions = onCall({ region }, async () => {
  const db = getFirestore();
  const read = async (name: string) => (await db.collection(name).get()).docs.map((item) => ({ id: item.id, name: String(item.data().name || item.data().title || item.id), classId: String(item.data().classId || "") }));
  const [departments, subjects, classes, streams] = await Promise.all([read("departments"), read("subjects"), read("classes"), read("streams")]);
  return { departments, subjects, classes, streams };
});

export const fetchSignupRequests = onCall({ region }, async (request) => {
  await assertSuperAdminOrAdmin(request.auth?.uid);
  const snapshot = await getFirestore().collection("signupRequests").orderBy("createdAt", "desc").get();
  return { requests: snapshot.docs.filter((item) => !item.data().tenantId || item.data().tenantId === TENANT_ID).map((item) => ({ id: item.id, ...item.data(), tenantId: item.data().tenantId || TENANT_ID })) };
});

async function assertSuperAdminOrAdmin(uid?: string) {
  if (!uid) throw new HttpsError("unauthenticated", "Sign in is required.");
  const profile = await getFirestore().collection("users").doc(uid).get();
  if (!["admin", "superadmin"].includes(String(profile.data()?.role || "").toLowerCase())) throw new HttpsError("permission-denied", "Administrator access is required.");
}

export const decideSignupRequest = onCall({ region, secrets: [twilioAccountSid, twilioAuthToken, twilioSmsFrom, gmailClientId, gmailClientSecret, gmailRefreshToken] }, async (request) => {
  await assertSuperAdminOrAdmin(request.auth?.uid);
  const data = asRecord(request.data);
  const requestId = String(data.requestId || "");
  const decision = String(data.decision || "").toLowerCase();
  if (!requestId || !["approve", "reject"].includes(decision)) throw new HttpsError("invalid-argument", "Invalid signup decision.");
  const db = getFirestore();
  const requestRef = db.collection("signupRequests").doc(requestId);
  const snapshot = await requestRef.get();
  if (!snapshot.exists) throw new HttpsError("not-found", "Signup request not found.");
  const signup = snapshot.data() || {};
  if (signup.tenantId && String(signup.tenantId) !== TENANT_ID) throw new HttpsError("permission-denied", "This request belongs to another tenant.");
  if (signup.status !== "pending") throw new HttpsError("failed-precondition", "This request has already been decided.");
  if (decision === "reject") {
    await requestRef.update({ status: "rejected", decidedBy: request.auth?.uid, decidedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    return { status: "rejected" };
  }
  const role = signupRole(signup.role);
  const id = cleanId(data.id) || await generateAccountId(role);
  const email = idToEmail(id);
  const auth = getAuth();
  const password = String(data.password || `Astem-${Math.random().toString(36).slice(2, 8)}!`);
  if (password.length < 6) throw new HttpsError("invalid-argument", "A temporary password with at least 6 characters is required.");
  const created = await auth.createUser({ email, password, displayName: String(signup.displayName || "School member") });
  try {
    const extra: Record<string, unknown> = { ...asRecord(signup.extra), phone: String(signup.phone || ""), contactEmail: String(signup.email || "") };
    const batch = db.batch();
    batch.set(db.collection("users").doc(created.uid), { uid: created.uid, id, role, email, displayName: String(signup.displayName || "School member"), createdAt: FieldValue.serverTimestamp(), status: "active", tenantId: TENANT_ID, ...extra });
    batch.set(db.collection(profileCollections[role]).doc(id), { ...profileData(role, id, created.uid, String(signup.displayName || "School member"), email, extra), createdAt: FieldValue.serverTimestamp() });
    if (role === "parent" && Array.isArray(extra.studentIds)) {
      for (const studentId of extra.studentIds.map(String)) batch.set(db.collection("students").doc(studentId), { parentId: id, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    }
    batch.update(requestRef, { status: "approved", approvedUserId: created.uid, approvedAccountId: id, decidedBy: request.auth?.uid, decidedAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    await batch.commit();
    let deliveryStatus = "no-contact"; let deliveryError = ""; let emailStatus = "not-attempted"; let emailError = ""; let smsStatus = "not-attempted"; let smsError = "";
    try { emailStatus = `email-${await sendCredentialEmail(String(signup.email), id, password)}`; } catch (deliveryFailure) { emailStatus = "email-failed"; emailError = deliveryFailure instanceof Error ? deliveryFailure.message : "Email delivery failed."; }
    if (emailStatus !== "email-sent") { try { smsStatus = `sms-${await sendCredentialSms(String(signup.phone || ""), id, password)}`; } catch (deliveryFailure) { smsStatus = "sms-failed"; smsError = deliveryFailure instanceof Error ? deliveryFailure.message : "SMS delivery failed."; } }
    deliveryStatus = emailStatus === "email-sent" ? emailStatus : smsStatus === "sms-failed" && emailStatus === "email-failed" ? "email-failed-sms-failed" : smsStatus;
    deliveryError = [emailError && `Email: ${emailError}`, smsError && `SMS: ${smsError}`].filter(Boolean).join(" ");
    await requestRef.update({ deliveryStatus, emailStatus, emailError: emailError || null, smsStatus, smsError: smsError || null, deliveryError: deliveryError || null, deliveryUpdatedAt: FieldValue.serverTimestamp() });
    return { status: "approved", uid: created.uid, id, temporaryPassword: password, deliveryStatus, emailStatus, emailError: emailError || undefined, smsStatus, smsError: smsError || undefined, deliveryError: deliveryError || undefined };
  } catch (error) {
    await auth.deleteUser(created.uid).catch(() => undefined);
    throw error;
  }
});

export const createManagedUser = onCall({ region }, async (request) => {
  await assertSuperAdminOrAdmin(request.auth?.uid);
  const data = asRecord(request.data);
  const role = asRole(data.role);
  const caller = await getFirestore().collection("users").doc(String(request.auth?.uid || "")).get();
  if (String(caller.data()?.role || "").toLowerCase() === "admin" && role !== "student") throw new HttpsError("permission-denied", "Administrators can provision student accounts only.");
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

export const createTenantWithAdmin = onCall({ region }, async (request) => {
  await assertSuperAdmin(request.auth?.uid);
  const data = asRecord(request.data);
  const schoolName = String(data.schoolName || "").trim();
  const tenantId = cleanTenantId(data.schoolCode);
  const adminName = String(data.adminName || "").trim();
  const adminEmail = String(data.adminEmail || "").trim().toLowerCase();
  const password = String(data.password || "");
  const phone = String(data.phone || "").trim();
  if (!schoolName) throw new HttpsError("invalid-argument", "School name is required.");
  if (!adminName) throw new HttpsError("invalid-argument", "Tenant Admin name is required.");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new HttpsError("invalid-argument", "A valid Admin email is required.");
  if (password.length < 6) throw new HttpsError("invalid-argument", "The temporary password must contain at least 6 characters.");
  const db = getFirestore();
  const tenantRef = db.collection("tenants").doc(tenantId);
  if ((await tenantRef.get()).exists) throw new HttpsError("already-exists", `School code "${tenantId}" is already in use.`);
  const adminId = await generateAccountId("admin");
  const auth = getAuth();
  const created = await auth.createUser({ email: idToEmail(adminId), password, displayName: adminName });
  try {
    const now = FieldValue.serverTimestamp();
    const batch = db.batch();
    batch.set(tenantRef, { tenantId, schoolCode: tenantId, schoolName, contactEmail: adminEmail, phone, status: "active", createdBy: request.auth?.uid, createdAt: now, updatedAt: now });
    batch.set(db.collection("users").doc(created.uid), { uid: created.uid, id: adminId, role: "admin", email: idToEmail(adminId), contactEmail: adminEmail, displayName: adminName, phone, tenantId, status: "active", createdAt: now, updatedAt: now });
    batch.set(db.collection("admins").doc(adminId), { ...profileData("admin", adminId, created.uid, adminName, idToEmail(adminId), { phone, contactEmail: adminEmail }), tenantId, phone, contactEmail: adminEmail, createdAt: now });
    await batch.commit();
  } catch (error) {
    await auth.deleteUser(created.uid).catch(() => undefined);
    throw error;
  }
  return { tenantId, schoolName, adminUid: created.uid, adminId, loginEmail: idToEmail(adminId) };
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
