import { collection, doc, getDoc, getDocs, query, where } from "firebase/firestore";
import type { QueryConstraint } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { calculateFinalScore, getGradingConfiguration, gradeForScore } from "./GradingConfigurationService";
import { calculateRankings } from "./RankingService";
import { fetchTermComments } from "./TermCommentsService";

export interface ReportCardFilters {
  academicYear?: string;
  term?: string;
}

export const fetchReportCardData = async (studentId: string, filters: ReportCardFilters = {}) => {
  const studentDoc = await getDoc(doc(db, "students", studentId));
  if (!studentDoc.exists()) {
    console.warn("Student not found:", studentId);
    return null;
  }

  const studentData = studentDoc.data();
  const gradingConfiguration = await getGradingConfiguration();
  const classId = studentData.classId ?? null;
  let className = "Unassigned Class";
  if (classId) {
    const classDoc = await getDoc(doc(db, "classes", classId));
    if (classDoc.exists()) className = classDoc.data().name || className;
  }

  const termName = filters.term || "All terms";
  const streamId = String(studentData.streamId || studentData.stream || "");
  const departmentId = String(studentData.departmentId || studentData.department || "");

  const gradeConstraints: QueryConstraint[] = [where("studentId", "==", studentId)];
  if (filters.academicYear) gradeConstraints.push(where("academicYear", "==", filters.academicYear));
  if (filters.term) gradeConstraints.push(where("term", "==", filters.term));
  const gradeQuery = query(collection(db, "grades"), ...gradeConstraints);
  const gradeSnapshot = await getDocs(gradeQuery);
  let totalMarks = 0;
  const subjects = gradeSnapshot.docs.map((item) => {
    const grade = item.data();
    const classScore = grade.classScore ?? grade.classMark;
    const examScore = grade.examScore ?? grade.examMark;
    const mark = calculateFinalScore(classScore == null ? undefined : Number(classScore), examScore == null ? undefined : Number(examScore), gradingConfiguration);
    totalMarks += mark;
    return {
      name: grade.subject || grade.subjectName || grade.assignmentTitle || "Unknown Subject",
      mark,
      classScore: classScore == null ? undefined : Number(classScore),
      examScore: examScore == null ? undefined : Number(examScore),
      finalScore: Number(grade.finalScore ?? mark),
      grade: gradeForScore(mark, gradingConfiguration.bands).grade,
      remark: gradeForScore(mark, gradingConfiguration.bands).label,
      points: gradeForScore(mark, gradingConfiguration.bands).points,
    };
  });

  const attendanceQuery = query(collection(db, "attendance"), where("studentId", "==", studentId));
  const attendanceSnapshot = await getDocs(attendanceQuery);
  const presentDays = attendanceSnapshot.docs.filter((item) => {
    const attendance = item.data();
    return attendance.present === true || attendance.status === "Present";
  }).length;
  const rankingFilters = { academicYear: filters.academicYear, term: filters.term };
  const [classRankings, streamRankings, departmentRankings, overallRankings] = await Promise.all([
    calculateRankings({ ...rankingFilters, classId: classId || undefined }),
    streamId ? calculateRankings({ ...rankingFilters, streamId }) : Promise.resolve([]),
    departmentId ? calculateRankings({ ...rankingFilters, departmentId }) : Promise.resolve([]),
    calculateRankings(rankingFilters),
  ]);
  const ranking = classRankings.find(item => item.studentId === studentId);
  const streamRanking = streamRankings.find(item => item.studentId === studentId);
  const departmentRanking = departmentRankings.find(item => item.studentId === studentId);
  const overallRanking = overallRankings.find(item => item.studentId === studentId);
  const gpa = subjects.length ? subjects.reduce((sum, subject) => sum + subject.points, 0) / subjects.length : 0;
  const comments = filters.academicYear && filters.term ? await fetchTermComments(studentId, filters.academicYear, filters.term) : null;

  return {
    studentName: studentData.displayName || studentData.name || studentData.studentName || "Unknown",
    className,
    streamName: studentData.streamName || studentData.stream || streamId || "Not assigned",
    departmentName: studentData.departmentName || studentData.department || departmentId || "Not assigned",
    termName,
    academicYear: filters.academicYear || "All academic years",
    subjects,
    average: subjects.length ? totalMarks / subjects.length : 0,
    gpa,
    rank: ranking?.rank || null,
    rankedStudents: classRankings.length,
    positions: {
      class: ranking ? { position: ranking.rank, total: classRankings.length } : null,
      stream: streamRanking ? { position: streamRanking.rank, total: streamRankings.length } : null,
      department: departmentRanking ? { position: departmentRanking.rank, total: departmentRankings.length } : null,
      overall: overallRanking ? { position: overallRanking.rank, total: overallRankings.length } : null,
    },
    interests: comments?.interests || studentData.interests || studentData.interest || "",
    conductRemark: comments?.conductRemark || studentData.conductRemark || studentData.remarks || "",
    attendanceRemark: comments?.attendanceRemark || "",
    nextSteps: comments?.nextSteps || "",
    attendance: {
      present: presentDays,
      total: attendanceSnapshot.size,
    },
  };
};
