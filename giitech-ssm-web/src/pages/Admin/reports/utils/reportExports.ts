// src/pages/Admin/reports/utils/reportExports.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const exportToCSV = (data: any[], filename: string) => {
  if (!data.length) return alert("No data to export");

  const headers = Object.keys(data[0]);
  const csv = [
    headers.join(","),
    ...data.map((row) => headers.map((h) => JSON.stringify(row[h] ?? "")).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

export const exportToPDF = (data: any[], filename: string) => {
  if (!data.length) return alert("No data to export");

  const doc = new jsPDF({ orientation: "landscape" });
  doc.setFontSize(14);
  doc.text(filename, 14, 15);

  const headers = Object.keys(data[0]);
  const tableData = data.map((row) => headers.map((h) => row[h] ?? ""));

  autoTable(doc, {
    head: [headers],
    body: tableData,
    startY: 20,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [66, 66, 66] },
  });

  doc.save(`${filename}.pdf`);
};
