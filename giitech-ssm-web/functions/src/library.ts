import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { logger } from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";

const clean = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "_");

export const scheduledLibraryOverdueSync = onSchedule(
  { schedule: "every day 07:00", timeZone: "Africa/Accra", region: "europe-west1" },
  async () => {
    const db = getFirestore();
    const today = new Date().toISOString().slice(0, 10);
    const loans = await db.collection("libraryLoans").where("status", "==", "borrowed").get();
    let overdueCount = 0;
    const batch = db.batch();
    loans.docs.forEach((loanDocument) => {
      const loan = loanDocument.data();
      const dueDate = String(loan.dueDate || "");
      if (!dueDate || dueDate >= today) return;
      overdueCount += 1;
      batch.update(loanDocument.ref, { status: "overdue", updatedAt: FieldValue.serverTimestamp() });
      const notificationId = `library_overdue_${clean(loanDocument.id)}`;
      batch.set(db.collection("notifications").doc(notificationId), {
        title: "Library book overdue",
        message: `\"${String(loan.bookTitle || "Library book")}\" was due on ${dueDate}. Please return it to the library.`,
        category: "alert",
        workflow: "library_overdue",
        managed: true,
        active: true,
        recipientUserId: String(loan.borrowerId || ""),
        route: "/student/library",
        updatedAt: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    });
    if (overdueCount) await batch.commit();
    logger.info("Library overdue sync complete", { overdueCount });
  },
);
