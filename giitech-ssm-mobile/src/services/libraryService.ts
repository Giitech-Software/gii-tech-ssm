import { addDoc, collection, doc, getDocs, orderBy, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import { db } from "../firebaseConfig";

export type LibraryLoan = { id: string; bookTitle: string; borrowerName: string; dueDate: string; status: "borrowed" | "returned" | "overdue" };
export type LibraryBook = { id: string; title: string; bookNumber: string; author: string; category?: string; availableCopies: number; totalCopies: number };

export async function fetchLibraryBooks(): Promise<LibraryBook[]> {
  const snapshot = await getDocs(query(collection(db, "libraryBooks"), orderBy("title")));
  return snapshot.docs.map((item) => ({ id: item.id, ...item.data() })) as LibraryBook[];
}

export async function fetchLibraryLoans(): Promise<(LibraryLoan & { borrowerId: string; bookId: string })[]> {
  const snapshot = await getDocs(query(collection(db, "libraryLoans"), orderBy("dueDate", "asc")));
  const today = new Date().toISOString().slice(0, 10);
  return snapshot.docs.map((item) => { const data = item.data() as Omit<LibraryLoan & { borrowerId: string; bookId: string }, "id">; return { id: item.id, ...data, status: data.status === "borrowed" && data.dueDate < today ? "overdue" : data.status }; });
}

export async function addLibraryBook(input: Omit<LibraryBook, "id" | "availableCopies">) {
  if (!input.title.trim() || !input.bookNumber.trim() || !input.author.trim() || input.totalCopies < 1) throw new Error("Complete the required book fields.");
  await addDoc(collection(db, "libraryBooks"), { ...input, availableCopies: input.totalCopies, createdAt: serverTimestamp(), updatedAt: serverTimestamp() });
}

export async function issueLibraryBook(book: LibraryBook, borrowerId: string, borrowerName: string, dueDate: string) {
  if (book.availableCopies < 1) throw new Error("No copies are available.");
  const existing = await getDocs(query(collection(db, "libraryLoans"), where("borrowerId", "==", borrowerId), where("status", "in", ["borrowed", "overdue"])));
  if (!existing.empty) throw new Error("This borrower has an unreturned book and cannot borrow another.");
  await addDoc(collection(db, "libraryLoans"), { bookId: book.id, bookTitle: book.title, borrowerId, borrowerName, dueDate, status: "borrowed", borrowedAt: serverTimestamp(), createdAt: serverTimestamp() });
  await updateDoc(doc(db, "libraryBooks", book.id), { availableCopies: book.availableCopies - 1, updatedAt: serverTimestamp() });
  await addDoc(collection(db, "notifications"), { recipientUserId: borrowerId, title: "Library book issued", message: `\"${book.title}\" is due on ${dueDate}.`, type: "library_due_date", read: false, createdAt: serverTimestamp() });
}

export async function returnLibraryBook(loan: LibraryLoan & { bookId: string }) {
  await updateDoc(doc(db, "libraryLoans", loan.id), { status: "returned", returnedAt: serverTimestamp(), updatedAt: serverTimestamp() });
  const bookRef = doc(db, "libraryBooks", loan.bookId); const bookSnapshot = await getDocs(query(collection(db, "libraryBooks"), where("__name__", "==", loan.bookId)));
  if (!bookSnapshot.empty) await updateDoc(bookRef, { availableCopies: (bookSnapshot.docs[0].data().availableCopies || 0) + 1, updatedAt: serverTimestamp() });
}

export async function fetchMyLibraryLoans(userId: string): Promise<LibraryLoan[]> {
  const snapshot = await getDocs(query(collection(db, "libraryLoans"), where("borrowerId", "==", userId), orderBy("dueDate", "asc")));
  const today = new Date().toISOString().slice(0, 10);
  return snapshot.docs.map((item) => {
    const data = item.data() as Omit<LibraryLoan, "id">;
    return { id: item.id, ...data, status: data.status === "borrowed" && data.dueDate < today ? "overdue" : data.status };
  });
}
