/**
 * utils/firestoreHelpers.ts
 * -----------------------------------------------------
 * Centralized Firestore helper functions for Smart School Manager
 * -----------------------------------------------------
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

/* -------------------------------------------------------------------------- */
/*                                🔹 USERS                                    */
/* -------------------------------------------------------------------------- */

/** Get all users (any role) */
export const getAllUsers = async () => {
  const snapshot = await getDocs(collection(db, "users"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/** Get users by specific role (admin, teacher, student, parent) */
export const getUsersByRole = async (role: string) => {
  const q = query(collection(db, "users"), where("role", "==", role));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/** Create a new user document */
export const createUser = async (userData: any) => {
  const userRef = doc(collection(db, "users"));
  await setDoc(userRef, {
    ...userData,
    createdAt: new Date().toISOString(),
  });
  return userRef.id;
};

/** Get single user by UID */
export const getUserByUID = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  const snapshot = await getDoc(userRef);
  return snapshot.exists() ? snapshot.data() : null;
};

/** Update user document */
export const updateUser = async (uid: string, data: any) => {
  const userRef = doc(db, "users", uid);
  await updateDoc(userRef, data);
};

/** Delete user document */
export const deleteUser = async (uid: string) => {
  const userRef = doc(db, "users", uid);
  await deleteDoc(userRef);
};

/* -------------------------------------------------------------------------- */
/*                              🔹 TEACHERS                                   */
/* -------------------------------------------------------------------------- */

export const getAllTeachers = async () => {
  const snapshot = await getDocs(collection(db, "teachers"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* -------------------------------------------------------------------------- */
/*                              🔹 STUDENTS                                   */
/* -------------------------------------------------------------------------- */

export const getAllStudents = async () => {
  const snapshot = await getDocs(collection(db, "students"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/** Get students by class ID */
export const getStudentsByClass = async (classId: string) => {
  const q = query(collection(db, "students"), where("classId", "==", classId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* -------------------------------------------------------------------------- */
/*                              🔹 CLASSES                                    */
/* -------------------------------------------------------------------------- */

export const getAllClasses = async () => {
  const snapshot = await getDocs(collection(db, "classes"));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/** Get classes by teacher ID */
export const getClassesByTeacher = async (teacherId: string) => {
  const q = query(collection(db, "classes"), where("teacherId", "==", teacherId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* -------------------------------------------------------------------------- */
/*                              🔹 ASSIGNMENTS                                */
/* -------------------------------------------------------------------------- */

export const getAssignmentsByClass = async (classId: string) => {
  const q = query(collection(db, "assignments"), where("classId", "==", classId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* -------------------------------------------------------------------------- */
/*                              🔹 SUBMISSIONS                                */
/* -------------------------------------------------------------------------- */

export const getSubmissionsByAssignment = async (assignmentId: string) => {
  const q = query(collection(db, "submissions"), where("assignmentId", "==", assignmentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* -------------------------------------------------------------------------- */
/*                              🔹 GRADES                                     */
/* -------------------------------------------------------------------------- */

export const getGradesByStudent = async (studentId: string) => {
  const q = query(collection(db, "grades"), where("studentId", "==", studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* -------------------------------------------------------------------------- */
/*                              🔹 ATTENDANCE                                 */
/* -------------------------------------------------------------------------- */

export const getAttendanceByClass = async (classId: string) => {
  const q = query(collection(db, "attendance"), where("classId", "==", classId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* -------------------------------------------------------------------------- */
/*                              🔹 FEES                                       */
/* -------------------------------------------------------------------------- */

export const getFeesByStudent = async (studentId: string) => {
  const q = query(collection(db, "fees"), where("studentId", "==", studentId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/* -------------------------------------------------------------------------- */
/*                              🔹 ACTIVITY LOGS                              */
/* -------------------------------------------------------------------------- */

export const logActivity = async (userId: string, action: string, details?: any) => {
  await addDoc(collection(db, "activityLogs"), {
    userId,
    action,
    details: details || {},
    createdAt: serverTimestamp(),
  });
}; 