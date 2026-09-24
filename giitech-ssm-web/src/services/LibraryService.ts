import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type LibraryBook = {
  id: string;
  title: string;
  bookNumber: string;
  author: string;
  isbn?: string;
  category?: string;
  shelfLocation?: string;
  description?: string;
  totalCopies: number;
  availableCopies: number;
  active: boolean;
};

export type LibraryLoan = {
  id: string;
  bookId: string;
  bookTitle: string;
  bookNumber?: string;
  borrowerId: string;
  borrowerName: string;
  dueDate: string;
  borrowedAt?: { toDate?: () => Date };
  returnedAt?: { toDate?: () => Date };
  status: "borrowed" | "returned" | "overdue";
};

export async function fetchLibraryBooks(): Promise<LibraryBook[]> {
  const snapshot = await getDocs(query(collection(db, "libraryBooks"), orderBy("title")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as LibraryBook[];
}

export async function addLibraryBook(input: Omit<LibraryBook, "id" | "availableCopies" | "active">) {
  await addDoc(collection(db, "libraryBooks"), {
    ...input,
    availableCopies: input.totalCopies,
    active: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export async function fetchLibraryLoans(): Promise<LibraryLoan[]> {
  const snapshot = await getDocs(query(collection(db, "libraryLoans"), orderBy("dueDate", "asc")));
  const today = new Date().toISOString().slice(0, 10);
  return snapshot.docs.map((item) => {
    const data = item.data() as Omit<LibraryLoan, "id">;
    const status = data.status === "borrowed" && data.dueDate < today ? "overdue" : data.status;
    return { id: item.id, ...data, status };
  });
}

export async function fetchUserLibraryLoans(userId: string): Promise<LibraryLoan[]> {
  const snapshot = await getDocs(query(collection(db, "libraryLoans"), where("borrowerId", "==", userId), orderBy("dueDate", "asc")));
  const today = new Date().toISOString().slice(0, 10);
  return snapshot.docs.map((item) => {
    const data = item.data() as Omit<LibraryLoan, "id">;
    return { id: item.id, ...data, status: data.status === "borrowed" && data.dueDate < today ? "overdue" : data.status };
  });
}

export async function issueLibraryBook(book: LibraryBook, borrowerId: string, borrowerName: string, dueDate: string) {
  if (book.availableCopies < 1) throw new Error("This book has no available copies.");
  const existing = await getDocs(query(collection(db, "libraryLoans"), where("borrowerId", "==", borrowerId), where("status", "in", ["borrowed", "overdue"])));
  if (!existing.empty) throw new Error("This borrower has an unreturned book and cannot borrow another.");
  await addDoc(collection(db, "libraryLoans"), {
    bookId: book.id,
    bookTitle: book.title,
    bookNumber: book.bookNumber,
    borrowerId,
    borrowerName,
    dueDate,
    status: "borrowed",
    borrowedAt: serverTimestamp(),
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "libraryBooks", book.id), {
    availableCopies: book.availableCopies - 1,
    updatedAt: serverTimestamp(),
  });
  await addDoc(collection(db, "notifications"), {
    recipientUserId: borrowerId,
    title: "Library book issued",
    message: `\"${book.title}\" is due on ${dueDate}. Please return it on time.`,
    type: "library_due_date",
    read: false,
    createdAt: serverTimestamp(),
  });
}

export async function returnLibraryBook(loan: LibraryLoan) {
  await updateDoc(doc(db, "libraryLoans", loan.id), {
    status: "returned",
    returnedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const book = await getDocs(query(collection(db, "libraryBooks"), where("title", "==", loan.bookTitle)));
  const match = book.docs.find((item) => item.id === loan.bookId);
  if (match) await updateDoc(doc(db, "libraryBooks", loan.bookId), { availableCopies: (match.data().availableCopies || 0) + 1, updatedAt: serverTimestamp() });
}
