import { getFirestore, FieldValue, type WriteBatch } from "firebase-admin/firestore";

type NotificationCategory = "announcement" | "alert" | "info";

interface AssignmentRecord {
  id: string;
  title: string;
  classId?: string;
  teacherId?: string;
  dueDate?: unknown;
}

interface StudentRecord {
  id: string;
  studentId: string;
  displayName: string;
  classId?: string;
  parentId?: string;
}

interface ParentRecord {
  parentId: string;
  studentIds: string[];
}

interface LedgerSummary {
  studentId: string;
  studentName: string;
  charged: number;
  paid: number;
  balance: number;
}

interface ManagedNotification {
  id: string;
  title: string;
  message: string;
  category: NotificationCategory;
  route: string;
  workflow: string;
  target?: string;
  recipientUserId?: string;
  recipientRoles?: string[];
}

export interface EscalationSyncResult {
  active: number;
  resolved: number;
}

const sanitize = (value: string) => value.replace(/[^a-zA-Z0-9_-]+/g, "_");

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate();
  }
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildLedgers(
  charges: Array<Record<string, unknown>>,
  payments: Array<Record<string, unknown>>,
): LedgerSummary[] {
  const ledgers = new Map<string, LedgerSummary>();
  const getLedger = (record: Record<string, unknown>) => {
    const studentId = String(record.studentId || "");
    const item = ledgers.get(studentId) || {
      studentId,
      studentName: String(record.studentName || studentId),
      charged: 0,
      paid: 0,
      balance: 0,
    };
    ledgers.set(studentId, item);
    return item;
  };
  charges.forEach((charge) => {
    const item = getLedger(charge);
    item.charged += Number(charge.amount) || 0;
    item.balance = item.charged - item.paid;
  });
  payments.forEach((payment) => {
    const item = getLedger(payment);
    item.paid += Number(payment.amount) || 0;
    item.balance = item.charged - item.paid;
  });
  return [...ledgers.values()];
}

async function commitBatches(writes: Array<(batch: WriteBatch) => void>) {
  const db = getFirestore();
  for (let index = 0; index < writes.length; index += 450) {
    const batch = db.batch();
    writes.slice(index, index + 450).forEach((write) => write(batch));
    await batch.commit();
  }
}

export async function synchronizeWorkflowEscalations(): Promise<EscalationSyncResult> {
  const db = getFirestore();
  const [
    studentSnapshot,
    parentSnapshot,
    chargeSnapshot,
    paymentSnapshot,
    assignmentSnapshot,
    submissionSnapshot,
    notificationSnapshot,
  ] = await Promise.all([
    db.collection("students").get(),
    db.collection("parents").get(),
    db.collection("studentCharges").get(),
    db.collection("feePayments").get(),
    db.collection("assignments").get(),
    db.collection("submissions").get(),
    db.collection("notifications").where("managed", "==", true).get(),
  ]);
  const students: StudentRecord[] = studentSnapshot.docs.map((item) => ({
    id: item.id,
    studentId: String(item.data().studentId || item.id),
    displayName: String(item.data().displayName || item.data().studentName || item.id),
    classId: item.data().classId,
    parentId: item.data().parentId,
  }));
  const parents: ParentRecord[] = parentSnapshot.docs.map((item) => ({
    parentId: String(item.data().parentId || item.id),
    studentIds: item.data().studentIds || [],
  }));
  const assignments: AssignmentRecord[] = assignmentSnapshot.docs.map((item) => ({
    id: item.id,
    title: String(item.data().title || "Assignment"),
    classId: item.data().classId,
    teacherId: item.data().teacherId,
    dueDate: item.data().dueDate,
  }));
  const managed = new Map<string, ManagedNotification>();
  const studentsByClass = new Map<string, StudentRecord[]>();

  students.forEach((student) => {
    if (!student.classId) return;
    studentsByClass.set(student.classId, [...(studentsByClass.get(student.classId) || []), student]);
  });
  buildLedgers(
    chargeSnapshot.docs.map((item) => item.data()),
    paymentSnapshot.docs.map((item) => item.data()),
  )
    .filter((ledger) => ledger.studentId && ledger.balance > 0)
    .forEach((ledger) => {
      const id = `fee_balance_${sanitize(ledger.studentId)}`;
      managed.set(id, {
        id,
        title: "Outstanding school fee balance",
        message: `${ledger.studentName} has an outstanding balance of GHS ${ledger.balance.toFixed(2)}.`,
        category: "alert",
        route: "/parent/fees",
        workflow: "fee_balance",
        target: ledger.studentId,
        recipientRoles: ["parent"],
      });
    });

  const parentsById = new Map(parents.map((parent) => [parent.parentId, parent]));
  students.forEach((student) => {
    const parent = student.parentId ? parentsById.get(student.parentId) : undefined;
    if (parent?.studentIds.includes(student.studentId)) return;
    const id = `family_link_${sanitize(student.studentId)}`;
    managed.set(id, {
      id,
      title: "Family link requires review",
      message: `${student.displayName} does not have a complete parent-student link.`,
      category: "alert",
      route: "/admin/identity-links",
      workflow: "family_link",
      recipientRoles: ["admin", "superadmin"],
    });
  });

  const assignmentsById = new Map(assignments.map((assignment) => [assignment.id, assignment]));
  const pendingByTeacher = new Map<string, number>();
  submissionSnapshot.docs.forEach((item) => {
    const submission = item.data();
    if (String(submission.status || "").toLowerCase() === "graded") return;
    const teacherId = assignmentsById.get(submission.assignmentId)?.teacherId;
    if (teacherId) pendingByTeacher.set(teacherId, (pendingByTeacher.get(teacherId) || 0) + 1);
  });
  pendingByTeacher.forEach((count, teacherId) => {
    const id = `pending_grading_${sanitize(teacherId)}`;
    managed.set(id, {
      id,
      title: "Submissions awaiting grading",
      message: `${count} student submission${count === 1 ? "" : "s"} require grading.`,
      category: "info",
      route: "/teacher/submissions",
      workflow: "pending_grading",
      recipientUserId: teacherId,
    });
  });

  const now = Date.now();
  const sevenDays = now + 7 * 24 * 60 * 60 * 1000;
  assignments.forEach((assignment) => {
    const deadline = asDate(assignment.dueDate);
    if (!assignment.classId || !deadline || deadline.getTime() < now || deadline.getTime() > sevenDays) return;
    (studentsByClass.get(assignment.classId) || []).forEach((student) => {
      const id = `assignment_due_${sanitize(assignment.id)}_${sanitize(student.studentId)}`;
      managed.set(id, {
        id,
        title: "Assignment deadline approaching",
        message: `${assignment.title} is due ${deadline.toLocaleDateString("en-GB")}.`,
        category: "info",
        route: "/student/assignments",
        workflow: "assignment_due",
        target: student.studentId,
        recipientRoles: ["student"],
      });
    });
  });

  const existing = new Map(notificationSnapshot.docs.map((item) => [item.id, item]));
  const writes: Array<(batch: WriteBatch) => void> = [];
  managed.forEach((notification) => {
    const current = existing.get(notification.id);
    writes.push((batch) =>
      batch.set(
        db.collection("notifications").doc(notification.id),
        {
          ...notification,
          managed: true,
          active: true,
          updatedAt: FieldValue.serverTimestamp(),
          ...(current ? {} : { createdAt: FieldValue.serverTimestamp() }),
        },
        { merge: true },
      ),
    );
  });
  let resolved = 0;
  existing.forEach((item, id) => {
    if (managed.has(id) || item.data().active === false) return;
    resolved += 1;
    writes.push((batch) =>
      batch.update(item.ref, {
        active: false,
        resolvedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    );
  });
  await commitBatches(writes);
  return { active: managed.size, resolved };
}
