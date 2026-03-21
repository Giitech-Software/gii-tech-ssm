import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Utility for colored console output
const log = {
  info: (msg: string) =>
    console.log(`%cℹ️ ${msg}`, "color:#3498db; font-weight:bold;"),
  success: (msg: string) =>
    console.log(`%c✅ ${msg}`, "color:#27ae60; font-weight:bold;"),
  warn: (msg: string) =>
    console.log(`%c⚠️ ${msg}`, "color:#f39c12; font-weight:bold;"),
  error: (msg: string) =>
    console.log(`%c❌ ${msg}`, "color:#e74c3c; font-weight:bold;"),
};

export async function runFirestorePermissionDiagnostics() {
  const db = getFirestore();
  const auth = getAuth();

  if (!auth.currentUser) {
    log.error("No authenticated user found. Please sign in first.");
    return;
  }

  const user = auth.currentUser;
  const userRef = doc(db, "users", user.uid);

  let userRole = "unknown";
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      userRole = (userSnap.data().role as string) || "undefined";
      log.info(`User role detected: ${userRole.toUpperCase()}`);
    } else {
      log.warn("User role not found in /users collection. Defaulting to 'unknown'.");
    }
  } catch (err) {
    if (err instanceof Error)
      log.error(`Failed to fetch user role: ${err.message}`);
  }

  log.info(`Running Firestore diagnostics for UID: ${user.uid}`);

  // Define test data
  const testDocRef = doc(collection(db, "submissions"));
  const testData = {
    studentId: user.uid,
    assignmentId: "TEST_ASSIGNMENT_ID",
    content: "Diagnostic test submission",
    createdAt: new Date(),
  };

  // ---- READ TEST ----
  try {
    const snap = await getDoc(testDocRef);
    if (snap.exists()) {
      log.success("Read: ✅ Able to read submission document.");
    } else {
      log.warn("Read: ⚠️ Document not found. Possibly missing or blocked by rules.");
    }
  } catch (err) {
    if (err instanceof Error) log.error(`Read: ${err.message}`);
  }

  // ---- CREATE TEST ----
  try {
    await setDoc(testDocRef, testData);
    log.success("Create: ✅ Able to create new submission document.");
  } catch (err) {
    if (err instanceof Error) {
      log.error(`Create: ${err.message}`);
      if (err.message.includes("Missing or insufficient permissions")) {
        log.warn(
          "🔍 Likely blocked by 'create' rule in /submissions — check if user role and studentId/userId match required conditions."
        );
      }
    }
  }

  // ---- UPDATE TEST ----
  try {
    await updateDoc(testDocRef, { updatedAt: new Date() });
    log.success("Update: ✅ Able to update submission document.");
  } catch (err) {
    if (err instanceof Error) {
      log.error(`Update: ${err.message}`);
      if (err.message.includes("Missing or insufficient permissions")) {
        log.warn(
          "🔍 Likely blocked by 'update' rule — user may not match teacherId/studentId or lack role privileges."
        );
      }
    }
  }

  // ---- DELETE TEST ----
  try {
    await deleteDoc(testDocRef);
    log.success("Delete: ✅ Able to delete submission document.");
  } catch (err) {
    if (err instanceof Error) {
      log.error(`Delete: ${err.message}`);
      if (err.message.includes("Missing or insufficient permissions")) {
        log.warn(
          "🔍 Delete likely blocked — expected behavior for students/teachers. Only admin/superadmin should pass."
        );
      }
    }
  }

  log.info("🧩 Firestore diagnostic test completed.");
  log.info(`Summary:
  👤 User: ${user.displayName || "No Name"}
  🆔 UID: ${user.uid}
  🧩 Role: ${userRole.toUpperCase()}
  📦 Tested Collection: submissions
  ✅ Tests: read / create / update / delete
  `);
}
