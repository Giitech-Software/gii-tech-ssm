import React, { useEffect } from "react";
import { convertAllDueDatesToTimestamps } from "../../utils/convertDueDates";

const ConvertDueDatesPage: React.FC = () => {
  useEffect(() => {
    const runConversion = async () => {
      await convertAllDueDatesToTimestamps();
    };

    runConversion();
  }, []);

  return (
    <div style={{ padding: "2rem" }}>
      <h2>Convert Assignment dueDate to Firestore Timestamps</h2>
      <p>Check your console for progress logs...</p>
    </div>
  );
};

export default ConvertDueDatesPage;
