import React, { useEffect } from "react";
import { seedDemoData } from "../services/firestoreSeeder";

const SeedPage: React.FC = () => {
  useEffect(() => {
    seedDemoData();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>🌱 Firestore Seeder Running...</h2>
      <p>Check your console and Firestore dashboard for inserted data.</p>
    </div>
  );
};

export default SeedPage;
