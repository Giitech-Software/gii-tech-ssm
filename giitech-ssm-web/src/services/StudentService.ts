// src/services/StudentService.ts
import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

const STUDENTS_COLLECTION = "students";

/**
 * Fetch all students
 */
export const fetchStudents = async () => {
  const snapshot = await getDocs(collection(db, STUDENTS_COLLECTION));
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

/**
 * Fetch a single student by ID
 */
export const fetchStudentById = async (studentId: string) => {
  const ref = doc(db, STUDENTS_COLLECTION, studentId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Student not found");
  return { id: snap.id, ...snap.data() };
};

/**
 * Add a new student
 */
export const addStudent = async (data: any) => {
  const docRef = await addDoc(collection(db, STUDENTS_COLLECTION), {
    ...data,
    createdAt: serverTimestamp(),
  });
  return docRef.id;
};

/**
 * Update existing student
 */
export const updateStudent = async (studentId: string, data: any) => {
  const ref = doc(db, STUDENTS_COLLECTION, studentId);
  await updateDoc(ref, data);
};

/**
 * Delete student
 */
export const deleteStudent = async (studentId: string) => {
  const ref = doc(db, STUDENTS_COLLECTION, studentId);
  await deleteDoc(ref);
};

