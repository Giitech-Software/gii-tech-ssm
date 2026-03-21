/**
 * Convert all Firestore assignment "dueDate" fields from strings or JS Dates
 * into proper Firestore Timestamps — using the Admin SDK (bypasses all rules).
 */

/**import admin from "firebase-admin";
import fs from "fs";

// === 1️⃣ Load Service Account JSON safely ===
const serviceAccount = JSON.parse(
  fs.readFileSync(new URL("./serviceAccountKey.json", import.meta.url))
);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

console.log("⏳ Starting dueDate conversion via Admin SDK...");

async function convertAllDueDatesToTimestamps() {
  try {
    const snapshot = await db.collection("assignments").get();
    console.log(`📚 Found ${snapshot.size} assignments.`);

    let total = 0;
    let strings = 0;
    let jsDates = 0;
    let timestamps = 0;
    let converted = 0;
    let missing = 0;

    for (const docSnap of snapshot.docs) {
      total++;
      const data = docSnap.data();
      const { dueDate } = data;

      if (!dueDate) {
        missing++;
        continue;
      }

      if (typeof dueDate === "string") {
        strings++;
        const newTimestamp = admin.firestore.Timestamp.fromDate(new Date(dueDate));
        await docSnap.ref.update({ dueDate: newTimestamp });
        converted++;
        console.log(`✅ Converted string → Timestamp for: ${docSnap.id}`);
      } else if (dueDate._seconds && dueDate._nanoseconds) {
        timestamps++;
      } else if (dueDate instanceof Date) {
        jsDates++;
        const newTimestamp = admin.firestore.Timestamp.fromDate(dueDate);
        await docSnap.ref.update({ dueDate: newTimestamp });
        converted++;
        console.log(`✅ Converted Date → Timestamp for: ${docSnap.id}`);
      } else {
        console.warn(`⚠️ Unknown type for ${docSnap.id}:`, dueDate);
      }
    }

    console.log("\n🎯 Conversion summary:");
    console.log(`   Total checked: ${total}`);
    console.log(`   ✅ Already timestamps: ${timestamps}`);
    console.log(`   🔄 Converted (from string): ${strings}`);
    console.log(`   🔄 Converted (from Date): ${jsDates}`);
    console.log(`   ❌ Missing dueDate: ${missing}`);
    console.log(`   🏁 Total converted: ${converted}`);
    console.log("🚀 Done!");
  } catch (err) {
    console.error("🔥 Error during conversion:", err);
  }
}

convertAllDueDatesToTimestamps();
*/