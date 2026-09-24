import { addDoc, collection, deleteDoc, doc, getDocs, query, serverTimestamp, where } from "firebase/firestore";
import { deleteObject, getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebaseConfig";

export type LearningMaterial = { id: string; title: string; description?: string; classId: string; subject?: string; teacherId: string; fileUrl: string; fileName: string; fileType: string; createdAt?: unknown };

export async function getMaterialsForTeacher(teacherId: string) { const snapshot = await getDocs(query(collection(db, "learningMaterials"), where("teacherId", "==", teacherId))); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as LearningMaterial)); }
export async function getMaterialsForClass(classId: string) { const snapshot = await getDocs(query(collection(db, "learningMaterials"), where("classId", "==", classId))); return snapshot.docs.map(item => ({ id: item.id, ...item.data() } as LearningMaterial)); }
export async function uploadLearningMaterial(input: { file: File; title: string; description: string; classId: string; subject: string; teacherId: string }) { const path = `materials/${input.teacherId}/${Date.now()}_${input.file.name}`; const storageRef = ref(storage, path); await uploadBytes(storageRef, input.file); const fileUrl = await getDownloadURL(storageRef); await addDoc(collection(db, "learningMaterials"), { title: input.title.trim(), description: input.description.trim(), classId: input.classId, subject: input.subject.trim(), teacherId: input.teacherId, fileUrl, fileName: input.file.name, fileType: input.file.type || "application/octet-stream", storagePath: path, createdAt: serverTimestamp() }); }
export async function removeLearningMaterial(material: LearningMaterial & { storagePath?: string }) { await deleteDoc(doc(db, "learningMaterials", material.id)); if (material.storagePath) await deleteObject(ref(storage, material.storagePath)); }
