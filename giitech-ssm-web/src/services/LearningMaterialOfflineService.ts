import type { LearningMaterial } from "./LearningMaterialService";

const databaseName = "giitech-ssm-offline";
const storeName = "learningMaterials";
const bookmarkKey = "giitech-ssm-material-bookmarks";

function openDatabase() { return new Promise<IDBDatabase>((resolve, reject) => { const request = indexedDB.open(databaseName, 1); request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: "id" }); request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); }); }
export async function cacheLearningMaterials(materials: LearningMaterial[]) { if (!("indexedDB" in window)) return; const database = await openDatabase(); const transaction = database.transaction(storeName, "readwrite"); materials.forEach(material => transaction.objectStore(storeName).put(material)); }
export async function getCachedLearningMaterials() { if (!("indexedDB" in window)) return []; const database = await openDatabase(); return new Promise<LearningMaterial[]>((resolve, reject) => { const request = database.transaction(storeName, "readonly").objectStore(storeName).getAll(); request.onsuccess = () => resolve(request.result as LearningMaterial[]); request.onerror = () => reject(request.error); }); }
export function getMaterialBookmarks() { try { return JSON.parse(localStorage.getItem(bookmarkKey) || "[]") as string[]; } catch { return []; } }
export function toggleMaterialBookmark(id: string) { const current = new Set(getMaterialBookmarks()); current.has(id) ? current.delete(id) : current.add(id); const next = [...current]; localStorage.setItem(bookmarkKey, JSON.stringify(next)); return next; }
