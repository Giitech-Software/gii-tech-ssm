import { db } from "../firebaseConfig";
import {
  collection,
  getDocs,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  limit,
  updateDoc,
} from "firebase/firestore";

export interface FeeStructure {
  id: string;
  feeId: string;
  name: string;
  amount: number;
  classId: string;
  streamId?: string | null;
}

// 🔹 Fetch all fees
export const fetchFees = async (): Promise<FeeStructure[]> => {
  const querySnapshot = await getDocs(collection(db, "fees"));
  return querySnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as FeeStructure[];
};

// 🔹 Generate next fee ID (like FEE001, FEE002)
const generateNextFeeId = async (): Promise<string> => {
  const feesRef = collection(db, "fees");
  const q = query(feesRef, orderBy("feeId", "desc"), limit(1));
  const snapshot = await getDocs(q);

  if (!snapshot.empty) {
    const lastId = snapshot.docs[0].data().feeId;
    const num = parseInt(lastId.replace("FEE", ""), 10) + 1;
    return `FEE${String(num).padStart(3, "0")}`;
  }
  return "FEE001";
};

// 🔹 Add new fee
export const addFee = async (
  name: string,
  amount: number,
  classId: string,
  streamId?: string
) => {
  const nextId = await generateNextFeeId();
  const newFee = {
    feeId: nextId,
    name,
    amount,
    classId,
    streamId: streamId || null,
    createdAt: new Date(),
  };
  await addDoc(collection(db, "fees"), newFee);
};

// 🔹 Delete fee
export const deleteFee = async (feeId: string) => {
  const feesSnapshot = await getDocs(collection(db, "fees"));
  const target = feesSnapshot.docs.find(
    (doc) => doc.data().feeId === feeId
  );
  if (target) await deleteDoc(doc(db, "fees", target.id));
};

// 🔹 Update fee
export const updateFee = async (
  feeId: string,
  updatedData: {
    name?: string;
    amount?: number;
    classId?: string;
    streamId?: string | null;
  }
) => {
  const feesSnapshot = await getDocs(collection(db, "fees"));
  const target = feesSnapshot.docs.find(
    (doc) => doc.data().feeId === feeId
  );

  if (!target) throw new Error("Fee not found");

  await updateDoc(doc(db, "fees", target.id), {
    ...updatedData,
    updatedAt: new Date(),
  });
};
