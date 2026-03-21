/**
 * firestoreSeeder.ts
 * -----------------------------------------------------
 * Demo Firestore Seeder for Assignments + Submissions
 * -----------------------------------------------------
 * ✅ Creates:
 *   - 2 Assignments
 *   - 3 Submissions (linked by assignmentId)
 * -----------------------------------------------------
 * Usage:
 *   Run once in your dev environment (e.g. inside a setup script or Admin route)
 * -----------------------------------------------------
 */

import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";

export const seedDemoData = async () => {
  try {
    console.log("🌱 Starting Firestore demo data seeding...");

    // ---------- ASSIGNMENTS ----------
    const assignments = [
      {
        id: "asgn001",
        title: "Maths Homework 1",
        description: "Solve exercises 1–5 on page 20",
        subject: "Mathematics",
        classId: "JHS1",
        teacherId: "tch001",
        dueDate: "2025-10-15",
        createdAt: serverTimestamp(),
      },
      {
        id: "asgn002",
        title: "English Essay",
        description: "Write an essay on 'My Best Day at School'",
        subject: "English Language",
        classId: "JHS2",
        teacherId: "tch002",
        dueDate: "2025-10-20",
        createdAt: serverTimestamp(),
      },
    ];

    // Add assignments
    for (const a of assignments) {
      await addDoc(collection(db, "assignments"), a);
      console.log(`✅ Assignment added: ${a.title}`);
    }

    // ---------- SUBMISSIONS ----------
    const submissions = [
      {
        assignmentId: "asgn001",
        studentId: "std001",
        studentName: "Alice Mensah",
        classId: "JHS1",
        submissionUrl:
          "https://storage.googleapis.com/demo-bucket/submissions/alice_math1.pdf",
        submittedAt: "2025-10-10T12:00:00Z",
        createdAt: serverTimestamp(),
      },
      {
        assignmentId: "asgn001",
        studentId: "std002",
        studentName: "Kwame Boateng",
        classId: "JHS1",
        submissionUrl:
          "https://storage.googleapis.com/demo-bucket/submissions/kwame_math1.pdf",
        submittedAt: "2025-10-11T15:30:00Z",
        createdAt: serverTimestamp(),
      },
      {
        assignmentId: "asgn002",
        studentId: "std003",
        studentName: "Abena Owusu",
        classId: "JHS2",
        submissionUrl:
          "https://storage.googleapis.com/demo-bucket/submissions/abena_essay.pdf",
        submittedAt: "2025-10-18T09:45:00Z",
        createdAt: serverTimestamp(),
      },
    ];

    for (const s of submissions) {
      await addDoc(collection(db, "submissions"), s);
      console.log(`📘 Submission added: ${s.studentName} → ${s.assignmentId}`);
    }

    console.log("🎉 Demo Firestore data successfully seeded!");
  } catch (error) {
    console.error("🔥 Firestore seeding failed:", error);
  }
};
