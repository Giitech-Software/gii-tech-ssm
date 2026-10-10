import { useCallback, useEffect, useState } from "react";
import type { ComponentProps } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useAuth } from "../src/contexts/AuthContext";
import { useSync } from "../src/contexts/SyncContext";
import {
  fetchNotifications,
  type WorkflowNotification,
} from "../src/services/communicationService";
import {
  fetchAdminDashboardDetail,
  fetchParentDashboardDetail,
  fetchStudentDashboardDetail,
  fetchTeacherDashboardDetail,
  type AdminDashboardDetail,
  type DashboardItem,
  type ParentDashboardDetail,
  type RecentActivityItem,
  type StudentDashboardDetail,
  type TeacherDashboardDetail,
} from "../src/services/mobileDashboardService";

type WebLoginProps = { id: string; password: string; error: string; resetSent: boolean; loading: boolean; showPassword: boolean; setId: (value: string) => void; setPassword: (value: string) => void; setShowPassword: (value: boolean) => void; onLogin: () => void; onReset: () => void };

function SimpleLogin(props: WebLoginProps) { return <View className="flex-1 items-center justify-center bg-slate-100 px-4 py-10"><View className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-7 shadow-xl sm:p-10"><Text className="text-xs font-bold uppercase tracking-widest text-primary">Secure school portal</Text><Text className="mt-2 text-3xl font-black text-slate-900">Welcome back</Text><Text className="mt-2 text-sm text-slate-500">Sign in with the school ID issued by your administrator.</Text>{!!props.error&&<Text className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">{props.error}</Text>}{!!props.resetSent&&<Text className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Password reset instructions sent to the account email.</Text>}<Text className="mt-8 text-sm font-semibold text-slate-900">User ID</Text><TextInput value={props.id} onChangeText={props.setId} className="mt-2 rounded-xl border border-slate-300 px-3 py-3 text-slate-900" placeholder="Enter your ID (e.g. STU001)" placeholderTextColor="#94a3b8"/><Text className="mt-5 text-sm font-semibold text-slate-900">Password</Text><View className="mt-2 flex-row items-center rounded-xl border border-slate-300 px-3"><TextInput value={props.password} onChangeText={props.setPassword} secureTextEntry={!props.showPassword} className="flex-1 py-3 text-slate-900" placeholder="Enter your password" placeholderTextColor="#94a3b8"/><Pressable onPress={()=>props.setShowPassword(!props.showPassword)}><MaterialCommunityIcons color="#64748b" name={props.showPassword?"eye-off-outline":"eye-outline"} size={20}/></Pressable></View><Pressable disabled={props.loading} onPress={props.onLogin} className="mt-6 items-center rounded-xl bg-primary px-4 py-3">{props.loading?<ActivityIndicator color="#fff"/>:<Text className="font-bold text-white">Login</Text>}</Pressable><Pressable disabled={props.loading} onPress={props.onReset}><Text className="mt-5 text-center text-sm font-bold text-primary">Forgot password?</Text></Pressable></View></View> }

function WebLoginFixed({ id, password, error, resetSent, loading, showPassword, setId, setPassword, setShowPassword, onLogin, onReset }: WebLoginProps) {
  return <View style={{ flex: 1, backgroundColor: "#020617", alignItems: "center", justifyContent: "center", padding: 40 }}><View style={{ flexDirection: "row", width: "100%", maxWidth: 1024, overflow: "hidden", borderRadius: 24, backgroundColor: "#fff" }}><View style={{ flex: 1, backgroundColor: "#1e3a8a", padding: 40 }}><Text className="text-xs font-bold uppercase tracking-widest text-sky-200">ASTEM-SSM</Text><Text className="mt-8 text-4xl font-black leading-tight text-white">Your school,{"\n"}connected.</Text><Text className="mt-5 text-sm leading-6 text-blue-100">A secure workspace for teaching, learning, attendance, and school operations.</Text><Text className="mt-20 text-xs text-blue-200">School management, designed for clarity.</Text></View><View style={{ flex: 1, padding: 40 }}><Text className="text-xs font-bold uppercase tracking-widest text-primary">Secure school portal</Text><Text className="mt-2 text-3xl font-black text-slate-900">Welcome back</Text><Text className="mt-2 text-sm text-slate-500">Sign in with the school ID issued by your administrator.</Text>{!!error&&<Text className="mt-6 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</Text>}{!!resetSent&&<Text className="mt-6 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">Password reset instructions sent to the account email.</Text>}<Text className="mt-8 text-sm font-semibold text-slate-900">User ID</Text><TextInput value={id} onChangeText={setId} className="mt-2 rounded-xl border border-slate-300 px-3 py-3 text-slate-900" placeholder="Enter your ID (e.g. STU001)" placeholderTextColor="#94a3b8"/><Text className="mt-5 text-sm font-semibold text-slate-900">Password</Text><View className="mt-2 flex-row items-center rounded-xl border border-slate-300 px-3"><TextInput value={password} onChangeText={setPassword} secureTextEntry={!showPassword} className="flex-1 py-3 text-slate-900" placeholder="Enter your password" placeholderTextColor="#94a3b8"/><Pressable onPress={()=>setShowPassword(!showPassword)}><MaterialCommunityIcons color="#64748b" name={showPassword?"eye-off-outline":"eye-outline"} size={20}/></Pressable></View><Pressable disabled={loading} onPress={onLogin} className="mt-6 items-center rounded-xl bg-primary px-4 py-3">{loading?<ActivityIndicator color="#fff"/>:<Text className="font-bold text-white">Login</Text>}</Pressable><Pressable disabled={loading} onPress={onReset}><Text className="mt-5 text-center text-sm font-bold text-primary">Forgot password?</Text></Pressable></View></View></View>;
}

function WebLogin({ id, password, error, resetSent, loading, showPassword, setId, setPassword, setShowPassword, onLogin, onReset }: WebLoginProps) {
  return <View className="relative flex-1 items-center justify-center overflow-hidden bg-slate-950 px-4 py-10"><View className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-sky-500/20" /><View className="absolute -bottom-32 -right-20 h-96 w-96 rounded-full bg-emerald-400/10" /><View className="relative w-full max-w-5xl overflow-hidden rounded-3xl border border-white/10 bg-white shadow-2xl lg:flex-row"><View className="bg-primary p-10 lg:w-1/2"><Text className="text-xs font-bold uppercase tracking-widest text-sky-200">ASTEM-SSM</Text><Text className="mt-8 text-4xl font-black leading-tight text-white">Your school,{"\n"}connected.</Text><Text className="mt-5 text-sm leading-6 text-blue-100">A secure workspace for teaching, learning, attendance, and school operations.</Text><Text className="mt-20 text-xs text-blue-200">School management, designed for clarity.</Text></View><View className="p-7 sm:p-10 lg:w-1/2"><Text className="text-xs font-bold uppercase tracking-widest text-primary">Secure school portal</Text><Text className="mt-2 text-3xl font-black tracking-tight text-slate-900">Welcome back</Text><Text className="mt-2 text-sm text-slate-500">Sign in with the school ID issued by your administrator.</Text>{!!error&&<Text className="mt-6 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</Text>}{!!resetSent&&<Text className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">Password reset instructions sent to the account email.</Text>}<Text className="mt-8 text-sm font-semibold text-slate-900">User ID</Text><TextInput value={id} onChangeText={setId} className="mt-2 rounded-xl border border-slate-300 px-3 py-3 text-slate-900" placeholder="Enter your ID (e.g. STU001)" placeholderTextColor="#94a3b8"/><Text className="mt-5 text-sm font-semibold text-slate-900">Password</Text><View className="mt-2 flex-row items-center rounded-xl border border-slate-300 px-3"><TextInput value={password} onChangeText={setPassword} onSubmitEditing={onLogin} secureTextEntry={!showPassword} className="flex-1 py-3 text-slate-900" placeholder="Enter your password" placeholderTextColor="#94a3b8"/><Pressable onPress={()=>setShowPassword(!showPassword)}><MaterialCommunityIcons color="#64748b" name={showPassword?"eye-off-outline":"eye-outline"} size={20}/></Pressable></View><Pressable disabled={loading} onPress={onLogin} className="mt-6 items-center rounded-xl bg-primary px-4 py-3">{loading?<ActivityIndicator color="#fff"/>:<Text className="font-bold text-white">Login</Text>}</Pressable><Pressable disabled={loading} onPress={onReset}><Text className="mt-5 text-center text-sm font-bold text-primary">Forgot password?</Text></Pressable></View></View></View>;
}

const studentTools = [
  ["Assignments", "Review coursework and deadlines.", "./student/assignments"],
  ["Learning materials", "Open class resources and bookmarks.", "./student/materials"],
  ["Submissions", "Open coursework and update submitted responses.", "./student/submissions"],
  ["Grades", "Check marks and teacher feedback.", "./student/grades"],
  ["Attendance", "Review your daily attendance.", "./student/attendance"],
  ["My library", "Track borrowed books and due dates.", "./student/library"],
] as const;

const parentTools = [
  ["Performance", "Review linked-student marks.", "./parent/performance"],
  ["Attendance", "Check daily attendance records.", "./parent/attendance"],
  ["Notifications", "Open family alerts and school updates.", "./parent/notifications"],
  ["Reports", "Open released term reports.", "./parent/reports"],
  ["Messages", "Continue school conversations.", "./parent/messages"],
  ["Fees", "Review balances and payments.", "./parent/fees"],
] as const;

const teacherTools = [
  ["Assignments", "Create and manage class coursework.", "./teacher/assignments"],
  ["QR attendance", "Scan student identity cards.", "./shared/qr-attendance"],
  ["AI mark review", "Approve or reject assisted marking suggestions.", "./teacher/ai-review"],
  ["Learning materials", "Upload and manage class resources.", "./teacher/materials"],
  ["Attendance", "Record the daily class register.", "./teacher/attendance"],
  ["Learner progress", "Record strengths, learning needs, interventions, and next steps.", "./teacher/learner-progress"],
  ["Submissions", "Review student work and record feedback.", "./teacher/submissions"],
  ["Grades", "Review recorded assignment and exam outcomes.", "./teacher/grades"],
  ["Assessment summary", "Review assignment performance and question-level outcomes.", "./teacher/assessment-summary"],
  ["Grade summary", "Compare student, class, and subject performance.", "./teacher/grade-summary"],
  ["Exam grades", "Record subject marks for configured exams.", "./teacher/exam-grades"],
  ["Feedback", "Open submissions that need teacher comments.", "./teacher/feedback"],
  ["Messages", "Continue school conversations.", "./teacher/messages"],
] as const;

const staffTools = [
  ["QR attendance", "Scan student identity cards.", "./shared/qr-attendance"],
  ["Staff Check-in/out", "Record your staff check-in, check-out, return, and verification.", "./staff/attendance"],
  ["QR staff verification", "Verify attendance with your staff identity card.", "./staff/qr-attendance"],
  ["My financial records", "Review payslips, loans, and welfare history.", "./staff/finance"],
] as const;

const adminTools = [
  ["Student Attendance", "Record the daily student register and student ID/QR attendance.", "./admin/student-attendance"],
  ["Staff Attendance", "Review and record staff check-in, check-out, and return.", "./admin/staff-attendance"],
  ["Attendance Administration", "Manage attendance identity, policy, and analytics.", "./admin/attendance-administration"],
  ["Graduated / Archive", "Search retained learner and staff records for future access.", "./admin/archive"],
  ["Graduation archive", "Move a completed class out of active students.", "./admin/graduation-archive"],
  ["Face enrollment", "Enroll or replace student and staff attendance faces.", "./admin/face-enrollment"],
  ["Subjects per class", "Define required subjects for each class.", "./admin/class-subjects"],
  ["Staff attendance policy", "Configure staff attendance hours and verification.", "./admin/staff-attendance-settings"],
  ["Staff QR identity", "Generate staff attendance identity cards.", "./admin/staff-qr"],
  ["Staff loan repayments", "Record repayments against staff loans.", "./admin/staff-loan-repayments"],
  ["Staff finance report", "Review payroll, loans, and welfare totals.", "./admin/staff-finance-report"],
  ["Staff movement report", "Review staff movement and early departures.", "./admin/staff-movement-report"],
  ["Students", "Maintain enrollment profiles and placement.", "./admin/students"],
  ["Create Student", "Create a student account with department, class, and stream placement.", "./superadmin/accounts"],
  ["AI budget alerts", "Review monthly AI budget warnings.", "./admin/ai-alerts"],
  ["AI cost controls", "Configure AI limits and budget protection.", "./admin/ai-settings"],
  ["AI usage report", "Review monthly AI generations and costs.", "./admin/ai-usage"],
  ["AI grading audit", "Review AI suggestions and teacher decisions.", "./admin/ai-audit"],
  ["Academic terms", "Manage teaching periods within a school year.", "./admin/terms"],
  ["Academic years", "Manage the active school year.", "./admin/academic-years"],
  ["Grading configuration", "Manage grade ranges and points.", "./admin/grading"],
  ["Student rankings", "Review overall performance positions.", "./admin/rankings"],
  ["QR attendance", "Scan student identity cards.", "./shared/qr-attendance"],
  ["Payment intents", "Monitor and reconcile Mobile Money payments.", "./admin/payment-intents"],
  ["Staff", "Maintain teaching staff profiles.", "./admin/staff"],
  ["Departments", "Define major school divisions.", "./admin/departments"],
  ["Classes", "Create class placement options.", "./admin/classes"],
  ["Streams", "Manage class streams.", "./admin/streams"],
  ["Activity logs", "Review administrative audit history.", "./admin/activity"],
  ["Communications", "Publish school notices and maintain the academic calendar.", "./admin/communications"],
  ["Bulk SMS / WhatsApp", "Queue messages for staff phone numbers.", "./admin/bulk-messaging"],
  ["Promotions", "Move students into their next placement.", "./admin/promotions"],
  ["Learner progress", "Record strengths, learning needs, interventions, and next steps.", "./admin/term-comments"],
  ["Assessment setup", "Configure terms and class exam windows.", "./admin/assessments"],
  ["Classwork and homework", "Manage coursework issued to classes.", "./teacher/assignments"],
  ["Tests and assessments", "Review test performance and assessment outcomes.", "./teacher/assessment-summary"],
  ["Exam/Test score entry", "Enter existing class and examination marks.", "./teacher/exam-grades"],
  ["Learner gradebook", "Manage class scores, exam scores, and calculated final results.", "./teacher/exam-grades"],
  ["Student submissions", "Monitor submitted classwork and homework.", "./teacher/submissions"],
  ["Assignment grades", "Review recorded coursework marks.", "./teacher/grades"],
  ["Report publishing", "Release reviewed term report snapshots.", "./admin/report-publishing"],
  ["Family links", "Connect parent and student profiles.", "./admin/family-links"],
  ["Fee structures", "Define class-based school fees.", "./admin/fees"],
  ["School library", "Manage books, borrowing, returns, and due dates.", "./admin/library"],
  ["Finance ledger", "Track student charges and payments.", "./admin/finance"],
  ["Reports", "Open student, performance, attendance, and report-card views.", "./admin/reports"],
  ["Institutional analytics", "Review enrollment, outcomes, attendance, and staff turnout.", "./admin/institutional-analytics"],
  ["Student QR identity", "Generate student lookup identity cards.", "./admin/student-qr"],
  ["Staff finance", "Review payroll, loans, repayments, and welfare records.", "./admin/staff-finance"],
  ["SSNIT compliance", "Review contributions and remittance status.", "./admin/ssnit"],
] as const;

const superAdminTools = [
  ["User management", "Review login identities and access roles.", "./superadmin/accounts"],
  ["Create user", "Provision a new school account.", "./superadmin/accounts"],
] as const;

const sharedTools = [
  ["Announcements", "Read notices and important school updates.", "./shared/announcements"],
  ["Notification preferences", "Control the alerts sent to your account.", "./shared/notification-preferences"],
  ["Academic calendar", "Review term dates, exams, and activities.", "./shared/calendar"],
  ["Notifications", "Open active alerts for your account.", "./shared/notifications"],
  ["Messages", "Continue secure school conversations.", "./shared/messages"],
] as const;

type DashboardCard = readonly [string, string | number, string];
type DashboardQueue = readonly [string, string | number, string, string];

function money(value: number) {
  return `GHS ${value.toFixed(2)}`;
}

function NotificationPreview({
  notifications,
  onOpen,
}: {
  notifications: WorkflowNotification[];
  onOpen: (route: string) => void;
}) {
  return (
    <View className="mt-6">
      <View className="mb-3 flex-row items-center justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
        <View className="mr-3 flex-1 flex-row items-center"><MaterialCommunityIcons color="#4f46e5" name="bell-outline" size={24} /><View className="ml-3"><Text className="text-base font-extrabold text-slate-900">Notifications</Text><Text className="mt-1 text-xs text-slate-500">Active workflow alerts and school notices.</Text></View></View>
        <Pressable
          className="rounded-2xl bg-white px-4 py-3 active:bg-slate-50"
          onPress={() => onOpen("/shared/notifications")}
        >
          <Text className="text-sm font-bold text-slate-700">Open</Text>
        </Pressable>
      </View>
      <View className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        {notifications.slice(0, 4).map((notification, index) => (
          <Pressable
            className={`p-5 active:bg-slate-50 ${index ? "border-t border-slate-100" : ""}`}
            key={notification.id}
            onPress={() => onOpen(notification.route || "/shared/notifications")}
          >
            <Text className="text-sm font-extrabold text-slate-900">{notification.title}</Text>
            <Text className="mt-1 text-xs leading-5 text-slate-500" numberOfLines={2}>
              {notification.message}
            </Text>
          </Pressable>
        ))}
        {!notifications.length && (
          <Text className="p-5 text-sm text-slate-500">No active notifications.</Text>
        )}
      </View>
    </View>
  );
}

function DashboardCards({ cards }: { cards: DashboardCard[] }) {
  return (
    <View className="mt-4 flex-row flex-wrap justify-between">
      {cards.map(([label, value, detail]) => (
        <View
          className="mb-3 w-[48%] rounded-xl border border-primary/25 bg-white p-4 shadow-sm shadow-primary/5 md:w-[23.5%] lg:w-[18.5%]"
          key={label}
        >
          <Text className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {label}
          </Text>
          <Text className="mt-3 text-2xl font-black text-slate-900">{value}</Text>
          <Text className="mt-1 text-xs leading-4 text-slate-500">{detail}</Text>
        </View>
      ))}
    </View>
  );
}

function AdminToolSection({ title, items, onOpen }: { title: string; items: readonly (readonly [string, string, string])[]; onOpen: (route: string) => void }) {
  if (!items.length) return null;
  return <View className="mt-6"><Text className="text-xs font-black uppercase tracking-widest text-primary">{title}</Text><View className="mt-3 gap-3">{items.map(([label, detail, route]) => <Pressable className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm active:bg-blue-50" key={route} onPress={() => onOpen(route)}><View className="flex-row items-center justify-between"><Text className="flex-1 text-base font-extrabold text-slate-900">{label}</Text><Text className="ml-3 text-lg font-bold text-accent1">›</Text></View><Text className="mt-1 text-sm leading-5 text-slate-500">{detail}</Text></Pressable>)}</View></View>;
}

void AdminToolSection;

function AdminCategorySection({ title, items, onOpen, active, onToggle }: { title: string; items: readonly (readonly [string, string, string])[]; onOpen: (route: string) => void; active: boolean; onToggle: () => void }) {
  const iconName: ComponentProps<typeof MaterialCommunityIcons>["name"] = title === "Academic operations" ? "school-outline" : title === "Attendance Workspace" ? "calendar-check-outline" : title === "Finance" ? "finance" : title === "AI tools" ? "robot-outline" : "shield-crown-outline";
  const toolIcon = (label: string): ComponentProps<typeof MaterialCommunityIcons>["name"] => ({
    Students: "account-group-outline",
    "Student QR identity": "card-account-details-outline",
    Staff: "account-tie-outline",
    Departments: "domain",
    Classes: "google-classroom",
    Streams: "source-branch",
    "Fee structures": "file-document-edit-outline",
    "Finance ledger": "book-currency-outline",
    "Payment intents": "credit-card-check-outline",
    "AI budget alerts": "alert-decagram-outline",
    "AI cost controls": "robot-industrial-outline",
    "AI usage report": "chart-donut-variant",
    "AI grading audit": "robot-confused-outline",
    "Student rankings": "podium-gold",
    Reports: "file-chart-outline",
    "Report publishing": "file-send-outline",
    Attendance: "calendar-check-outline",
    "QR attendance": "qrcode-scan",
    "Academic years": "calendar-range-outline",
    "Academic terms": "calendar-month-outline",
    "Assessment setup": "clipboard-edit-outline",
    "Grading configuration": "format-list-numbered",
    Communications: "bullhorn-outline",
    Promotions: "account-arrow-up-outline",
    "Family links": "account-switch-outline",
    "Activity logs": "clipboard-text-clock-outline",
  }[label] as ComponentProps<typeof MaterialCommunityIcons>["name"] || "tune-variant");
  return <View className="mt-4"><Pressable accessibilityRole="button" accessibilityState={{ expanded: active }} className={`rounded-2xl border p-4 shadow-sm ${active ? "border-primary bg-primary" : "border-slate-300 bg-white"}`} onPress={onToggle}><View className="flex-row items-center"><View className="mr-3 h-11 w-11 items-center justify-center rounded-xl bg-primary"><MaterialCommunityIcons color={active ? "#ffffff" : "#4338ca"} name={iconName} size={24} /></View><View className="flex-1"><Text className="text-base font-extrabold text-slate-900">{title}</Text><Text className="mt-1 text-xs text-slate-500">{items.length} tools available</Text></View><MaterialCommunityIcons color="#4f46e5" name={active ? "chevron-up" : "chevron-down"} size={25} /></View></Pressable>{active && <View className="mt-2 flex-row flex-wrap rounded-2xl border border-primary bg-primary/50 p-2">{items.map(([label, detail, route]) => <View className="w-1/2 p-1 md:w-1/4" key={route}><Pressable className="min-h-32 flex-1 rounded-xl border border-slate-200 bg-white p-4 active:bg-primary" onPress={() => onOpen(route)}><View className="flex-row items-center"><View className="mr-2 h-9 w-9 items-center justify-center rounded-xl bg-primary"><MaterialCommunityIcons color="#4f46e5" name={toolIcon(label)} size={20} /></View><MaterialCommunityIcons color="#4f46e5" name="chevron-right" size={21} /></View><Text className="mt-3 text-sm font-extrabold text-slate-900">{label}</Text><Text className="mt-1 text-xs leading-5 text-slate-500">{detail}</Text></Pressable></View>)}</View>}</View>;
}

function ActionQueue({
  items,
  onOpen,
}: {
  items: DashboardQueue[];
  onOpen: (route: string) => void;
}) {
  return (
    <View className="mt-6">
      <View className="mb-3 flex-row items-center rounded-2xl border border-slate-300 bg-white p-4 shadow-sm"><MaterialCommunityIcons color="#4f46e5" name="clipboard-check-outline" size={24} /><View className="ml-3"><Text className="text-base font-extrabold text-slate-900">Action queue</Text><Text className="mt-1 text-xs text-slate-500">The next work items that deserve attention.</Text></View></View>
      <View className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        {items.map(([label, value, detail, route], index) => (
          <Pressable
            className={`p-5 active:bg-slate-50 ${index ? "border-t border-slate-100" : ""}`}
            key={label}
            onPress={() => onOpen(route)}
          >
            <View className="flex-row items-start justify-between">
              <View className="mr-3 flex-1">
                <Text className="text-sm font-extrabold text-slate-900">{label}</Text>
                <Text className="mt-1 text-xs leading-5 text-slate-500">{detail}</Text>
              </View>
              <Text className="text-base font-black text-slate-900">{value}</Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function RecentList({
  title,
  subtitle,
  items,
  emptyText,
}: {
  title: string;
  subtitle: string;
  items: RecentActivityItem[];
  emptyText: string;
}) {
  return (
    <View className="mt-6">
      <View className="mb-3 flex-row items-center rounded-2xl border border-slate-300 bg-white p-4 shadow-sm"><MaterialCommunityIcons color="#4f46e5" name="history" size={24} /><View className="ml-3"><Text className="text-base font-extrabold text-slate-900">{title}</Text><Text className="mt-1 text-xs text-slate-500">{subtitle}</Text></View></View>
      <View className="mt-3 overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-sm">
        {items.map((item, index) => (
          <View className={`p-5 ${index ? "border-t border-slate-100" : ""}`} key={item.id}>
            <Text className="text-sm font-extrabold text-slate-900">{item.title}</Text>
            <Text className="mt-1 text-xs leading-5 text-slate-500">{item.detail}</Text>
          </View>
        ))}
        {!items.length && <Text className="p-5 text-sm text-slate-500">{emptyText}</Text>}
      </View>
    </View>
  );
}

function itemToQueue(item: DashboardItem): DashboardQueue {
  return [item.label, item.value, item.detail, item.route];
}

export default function Index() {
  const router = useRouter();
  const { user, role, displayName, loading, login, resetPassword, logout } = useAuth();
  const { status, pendingCount, lastSyncedAt, syncNow } = useSync();
  const [id, setId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [studentSummary, setStudentSummary] = useState<StudentDashboardDetail | null>(null);
  const [parentSummary, setParentSummary] = useState<ParentDashboardDetail | null>(null);
  const [teacherSummary, setTeacherSummary] = useState<TeacherDashboardDetail | null>(null);
  const [adminSummary, setAdminSummary] = useState<AdminDashboardDetail | null>(null);
  const [notifications, setNotifications] = useState<WorkflowNotification[]>([]);
  const [summaryError, setSummaryError] = useState("");
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeAdminCategory, setActiveAdminCategory] = useState<string | null>(null);

  const openRoute = useCallback(
    (route: string) => {
      router.push(route as never);
    },
    [router]
  );

  const loadStudentSummary = useCallback(async () => {
    if (!user || role !== "student") return;

    setSummaryLoading(true);
    setSummaryError("");
    try {
      setStudentSummary(await fetchStudentDashboardDetail(user.uid));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Unable to load your student dashboard."
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadStudentSummary();
  }, [loadStudentSummary]);

  const loadParentData = useCallback(async () => {
    if (!user || role !== "parent") return;

    setSummaryLoading(true);
    setSummaryError("");
    try {
      setParentSummary(await fetchParentDashboardDetail(user.uid));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Unable to load your family dashboard."
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadParentData();
  }, [loadParentData]);

  const loadTeacherSummary = useCallback(async () => {
    if (!user || role !== "teacher") return;

    setSummaryLoading(true);
    setSummaryError("");
    try {
      setTeacherSummary(await fetchTeacherDashboardDetail(user.uid));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Unable to load your teacher dashboard."
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadTeacherSummary();
  }, [loadTeacherSummary]);

  const loadAdminSummary = useCallback(async () => {
    if (!user || (role !== "admin" && role !== "superadmin")) return;

    setSummaryLoading(true);
    setSummaryError("");
    try {
      setAdminSummary(await fetchAdminDashboardDetail(user.uid));
    } catch (loadError) {
      setSummaryError(
        loadError instanceof Error ? loadError.message : "Unable to load the administration dashboard."
      );
    } finally {
      setSummaryLoading(false);
    }
  }, [role, user]);

  useEffect(() => {
    void loadAdminSummary();
  }, [loadAdminSummary]);

  const loadNotifications = useCallback(async () => {
    if (!user || !role) return;
    try {
      const result = await fetchNotifications(user.uid, role);
      setNotifications(result.data);
    } catch {
      setNotifications([]);
    }
  }, [role, user]);

  useEffect(() => {
    void loadNotifications();
  }, [loadNotifications]);

  const handleLogin = async () => {
    if (!id.trim() || !password) {
      setError("Enter your school ID and password.");
      return;
    }

    setSubmitting(true);
    setError("");
    setResetSent(false);
    try {
      await login(id, password);
    } catch {
      setError("Sign-in failed. Check your school ID and password.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = async () => {
    if (!id.trim()) {
      setError("Enter your school ID first.");
      return;
    }
    setSubmitting(true);
    setError("");
    setResetSent(false);
    try {
      await resetPassword(id);
      setResetSent(true);
    } catch {
      setError("Unable to send reset instructions. Check your school ID.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-950">
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text className="mt-4 text-base text-slate-300">Loading ASTEM...</Text>
      </View>
    );
  }

  if (!user) return <SimpleLogin id={id} password={password} error={error} resetSent={resetSent} loading={submitting} showPassword={showPassword} setId={setId} setPassword={setPassword} setShowPassword={setShowPassword} onLogin={handleLogin} onReset={handleReset} />;

  if (!user) {
    return (
      <SafeAreaView className="flex-1 bg-dark">
        <StatusBar style="light" />
        <KeyboardAvoidingView className="flex-1" behavior="padding" keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}>
          <ScrollView
            automaticallyAdjustKeyboardInsets
            contentContainerClassName="flex-grow justify-center px-6 pb-24 pt-10 lg:px-10 lg:py-16"
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
          >
          <View className="mb-8 w-full self-center lg:max-w-5xl">
            <Text className="text-sm font-bold uppercase tracking-widest text-accent1">
              ASTEM-SSM
            </Text>
            <Text className="mt-4 text-4xl font-black leading-tight text-white">
              Your school, connected.
            </Text>
            <Text className="mt-3 text-base leading-6 text-slate-300">
              Sign in with the school ID issued by your administrator.
            </Text>
          </View>

          <View className="w-full self-center rounded-3xl border border-slate-200 bg-light p-6 shadow-2xl lg:max-w-5xl lg:p-10">
            <Text className="text-xs font-bold uppercase tracking-widest text-primary">Secure school portal</Text>
            <Text className="mt-2 text-3xl font-black tracking-tight text-slate-900">Welcome back</Text>
            <Text className="mt-2 text-sm leading-5 text-slate-500">
              Sign in with the school ID issued by your administrator.
            </Text>

            <Text className="mt-6 text-xs font-bold uppercase tracking-wider text-slate-500">
              User ID
            </Text>
            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-base text-dark"
              onChangeText={setId}
              placeholder="Enter your ID (e.g. STU001)"
              placeholderTextColor="#94a3b8"
              value={id}
            />

            <Text className="mt-5 text-xs font-bold uppercase tracking-wider text-slate-500">
              Password
            </Text>
            <View className="mt-2 flex-row items-center rounded-2xl border border-slate-200 bg-slate-50 px-4">
              <TextInput
                className="flex-1 py-4 text-base text-dark"
                onChangeText={setPassword}
                onSubmitEditing={handleLogin}
                placeholder="Enter your password"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
              />
              <Pressable accessibilityLabel={showPassword ? "Hide password" : "Show password"} accessibilityRole="button" className="ml-3 p-1" onPress={() => setShowPassword((value) => !value)}>
                <MaterialCommunityIcons color="#64748b" name={showPassword ? "eye-off-outline" : "eye-outline"} size={22} />
              </Pressable>
            </View>

            {!!error && <Text className="mt-4 text-sm font-semibold text-red-600">{error}</Text>}
            {!!resetSent && <Text className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">Password reset instructions sent to the account email.</Text>}

            <Pressable
              className="mt-6 items-center rounded-2xl bg-primary px-4 py-4 active:bg-blue-900"
              disabled={submitting}
              onPress={handleLogin}
            >
              {submitting ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className="text-base font-bold text-white">Login</Text>
              )}
            </Pressable>
            <Pressable disabled={submitting} onPress={() => void handleReset()}>
              <Text className="mt-5 text-center text-sm font-bold text-primary">Forgot password?</Text>
            </Pressable>
          </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-slate-100">
      <StatusBar style="dark" />
      <ScrollView contentContainerClassName="px-5 py-6">
        <View className="-mx-5 rounded-none bg-slate-950 px-6 py-7">
          <Text className="text-xs font-bold uppercase tracking-widest text-sky-400">
            ASTEM-SSM
          </Text>
          <Text className="mt-4 text-3xl font-black text-white">
            Hello, {displayName || "school member"}
          </Text>
          <Text className="mt-2 text-base capitalize text-slate-300">
            {role || "Profile pending"} dashboard
          </Text>
        </View>

        <Text className="mt-8 text-lg font-extrabold text-slate-900">Key metrics</Text>
        <Text className="mt-2 text-base leading-6 text-slate-600">
          Open the same operational workflows as the web portal, with offline queues for mobile work.
        </Text>

        {role === "student" && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-slate-900">Student overview</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  Your academic snapshot
                </Text>
              </View>
              <Pressable
                className="rounded-2xl bg-sky-100 px-4 py-3 active:bg-sky-200"
                disabled={summaryLoading}
                onPress={loadStudentSummary}
              >
                <Text className="text-sm font-bold text-sky-800">
                  {summaryLoading ? "Loading..." : "Refresh"}
                </Text>
              </Pressable>
            </View>

            {!!summaryError && (
              <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {summaryError}
              </Text>
            )}

            {!!studentSummary && (
              <>
                {studentSummary.source === "cache" && (
                  <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Showing your saved offline snapshot.
                  </Text>
                )}
                <DashboardCards
                  cards={[
                    ["Assignments due", studentSummary.assignmentsDue, `${studentSummary.activeAssignments} active assignments`],
                    ["Submissions", studentSummary.submissions, "Coursework submitted"],
                    ["Grades", studentSummary.grades, "Recorded results"],
                    ["Attendance", `${studentSummary.attendanceRate}%`, `${studentSummary.attendanceRecords} attendance records`],
                  ]}
                />
                <ActionQueue
                  items={[
                    ...(studentSummary.nextWork.length
                      ? studentSummary.nextWork.map(itemToQueue)
                      : [["Assignments still to submit", studentSummary.assignmentsDue, "Review active coursework and deadlines.", "./student/assignments"] as DashboardQueue]),
                    ["Attendance record", `${studentSummary.attendanceRate}%`, "Review your daily attendance history.", "./student/attendance"],
                    ["Recorded grades", studentSummary.grades, "Check marks and teacher feedback.", "./student/grades"],
                  ]}
                  onOpen={openRoute}
                />
                <RecentList
                  emptyText="No recent grades have been recorded yet."
                  items={studentSummary.recentGrades}
                  subtitle="Latest marks and feedback from your teachers."
                  title="Recent grades"
                />
                <RecentList
                  emptyText="No attendance records have been captured yet."
                  items={studentSummary.attendanceTrend}
                  subtitle="Recent daily attendance entries."
                  title="Attendance trend"
                />
                <NotificationPreview notifications={notifications} onOpen={openRoute} />
                <Text className="mt-6 text-lg font-extrabold text-slate-900">Student tools</Text>
                {studentTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                    key={route}
                    onPress={() => openRoute(route)}
                  >
                    <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {role === "parent" && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-slate-900">Family overview</Text>
                <Text className="mt-1 text-sm text-slate-500">
                  {parentSummary?.students || 0} linked student profiles
                </Text>
              </View>
              <Pressable
                className="rounded-2xl bg-primary px-4 py-3 active:bg-primary"
                disabled={summaryLoading}
                onPress={loadParentData}
              >
                <Text className="text-sm font-bold text-white">
                  {summaryLoading ? "Loading..." : "Refresh"}
                </Text>
              </Pressable>
            </View>
            {!!summaryError && (
              <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {summaryError}
              </Text>
            )}
            {!!parentSummary && (
              <>
                {parentSummary.source === "cache" && (
                  <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Showing your saved offline family snapshot.
                  </Text>
                )}
                <DashboardCards
                  cards={[
                    ["Students", parentSummary.students, "Family profiles connected"],
                    ["Attendance", `${parentSummary.attendanceRate}%`, "Linked-student attendance"],
                    ["Reports", parentSummary.reports, "Published academic reports"],
                    ["Outstanding", money(parentSummary.outstandingBalance), "Open fee balances"],
                  ]}
                />
                <ActionQueue
                  items={[
                    ...(parentSummary.balances.length
                      ? parentSummary.balances.map(itemToQueue)
                      : [["Outstanding fee balance", money(parentSummary.outstandingBalance), "Review charges, payments, and receipts.", "./parent/fees"] as DashboardQueue]),
                    ["Workflow notifications", notifications.length, "Review family alerts and school updates.", "/shared/notifications"],
                    ["Published reports", parentSummary.reports, "Open released academic snapshots.", "./parent/reports"],
                  ]}
                  onOpen={openRoute}
                />
                <RecentList
                  emptyText="No recent grades are available yet."
                  items={parentSummary.recentGrades}
                  subtitle="Newest grade entries for linked students."
                  title="Recent grades"
                />
                <RecentList
                  emptyText="No released reports are available yet."
                  items={parentSummary.recentReports}
                  subtitle="Published academic snapshots for your wards."
                  title="Released reports"
                />
                <RecentList
                  emptyText="No recent attendance concerns."
                  items={parentSummary.attendanceConcerns}
                  subtitle="Recent absences across linked students."
                  title="Attendance concerns"
                />
                <NotificationPreview notifications={notifications} onOpen={openRoute} />
                <Text className="mt-3 text-lg font-extrabold text-slate-900">Parent tools</Text>
                {parentTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                    key={route}
                    onPress={() => router.push(route)}
                  >
                    <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {role === "teacher" && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between">
              <View>
                <Text className="text-lg font-extrabold text-slate-900">Teacher overview</Text>
                <Text className="mt-1 text-sm text-slate-500">Daily academic dashboard</Text>
              </View>
              <Pressable
                className="rounded-2xl bg-emerald-100 px-4 py-3 active:bg-emerald-200"
                disabled={summaryLoading}
                onPress={loadTeacherSummary}
              >
                <Text className="text-sm font-bold text-emerald-800">
                  {summaryLoading ? "Loading..." : "Refresh"}
                </Text>
              </Pressable>
            </View>
            {!!summaryError && (
              <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {summaryError}
              </Text>
            )}
            {!!teacherSummary && (
              <>
                {teacherSummary.source === "cache" && (
                  <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Showing your saved offline teacher snapshot.
                  </Text>
                )}
                <DashboardCards
                  cards={[
                    ["Active assignments", teacherSummary.activeAssignments, `${teacherSummary.assignments} assignments total`],
                    ["Pending grading", teacherSummary.pendingGrading, "Submissions awaiting review"],
                    ["Average mark", `${teacherSummary.averageMark}%`, `${teacherSummary.gradedSubmissions} graded submissions`],
                    ["Active alerts", notifications.length, "Workflow notifications"],
                    ["Classes", teacherSummary.classes, "Teaching registers"],
                  ]}
                />
                <ActionQueue
                  items={teacherSummary.queue.map(itemToQueue)}
                  onOpen={openRoute}
                />
                <RecentList
                  emptyText="No grades have been recorded yet."
                  items={teacherSummary.recentGrades}
                  subtitle="Latest assignment and exam marks."
                  title="Recent grades"
                />
                <NotificationPreview notifications={notifications} onOpen={openRoute} />
                <Text className="mt-3 text-lg font-extrabold text-slate-900">Teacher tools</Text>
                {teacherTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                    key={route}
                    onPress={() => router.push(route)}
                  >
                    <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
                  </Pressable>
                ))}
              </>
            )}
          </View>
        )}

        {role === "staff" && (
          <View className="mt-6">
            <Text className="text-lg font-extrabold text-slate-900">Staff tools</Text>
            {staffTools.map(([label, detail, route]) => <Pressable className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50" key={route} onPress={() => router.push(route)}><Text className="text-base font-extrabold text-slate-900">{label}</Text><Text className="mt-1 text-sm text-slate-600">{detail}</Text></Pressable>)}
          </View>
        )}

        {(role === "admin" || role === "superadmin") && (
          <View className="mt-6">
            <View className="flex-row items-center justify-between rounded-2xl border border-slate-300 bg-white p-4 shadow-sm">
                <View className="flex-1 flex-row items-center"><MaterialCommunityIcons color="#4338ca" name="view-dashboard-outline" size={25} /><View className="ml-3"><Text className="text-base font-extrabold text-slate-900">Administration dashboard</Text><Text className="mt-1 text-xs text-slate-500">Executive school operations summary</Text></View></View>
              <Pressable
                className="rounded-2xl bg-primary px-4 py-3 active:bg-primary"
                disabled={summaryLoading}
                onPress={loadAdminSummary}
              >
                <Text className="text-sm font-bold text-white">
                  {summaryLoading ? "Loading..." : "Refresh"}
                </Text>
              </Pressable>
            </View>
            {!!summaryError && (
              <Text className="mt-4 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">
                {summaryError}
              </Text>
            )}
            {!!adminSummary && (
              <>
                {adminSummary.source === "cache" && (
                  <Text className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-semibold text-amber-800">
                    Showing your saved offline administration snapshot.
                  </Text>
                )}
                <DashboardCards
                  cards={[
                    ["Active students", adminSummary.activeStudents, `${adminSummary.students} student profiles total`],
                    ["Staff profiles", adminSummary.staff, "Teaching and staff records"],
                    ["Outstanding fees", money(adminSummary.outstandingFees), `${adminSummary.studentsWithBalances} student ledgers`],
                    ["Attendance today", `${adminSummary.attendanceTodayRate}%`, `${adminSummary.attendanceTodayRecords} records today`],
                  ]}
                />
                {role === "superadmin" && superAdminTools.map(([label, detail, route]) => (
                  <Pressable
                    className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                    key={`${label}-${route}`}
                    onPress={() => openRoute(route)}
                  >
                    <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                    <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
                  </Pressable>
                ))}
                <View className="mt-6 flex-row items-center rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-sm"><MaterialCommunityIcons color="#1E3A8A" name="view-dashboard-outline" size={25} /><View className="ml-3"><Text className="text-base font-extrabold text-slate-900">Administration tools</Text><Text className="mt-1 text-xs text-slate-600">Choose a section to reveal its tools.</Text></View></View>
                <AdminCategorySection active={activeAdminCategory === "academic"} onToggle={() => setActiveAdminCategory(activeAdminCategory === "academic" ? null : "academic")} title="Academic operations" items={adminTools.filter(([label]) => ["Students", "Academic years", "Academic terms", "Grading configuration", "Student rankings"].includes(label))} onOpen={openRoute} />
                <AdminCategorySection active={activeAdminCategory === "attendance"} onToggle={() => setActiveAdminCategory(activeAdminCategory === "attendance" ? null : "attendance")} title="Attendance Workspace" items={adminTools.filter(([label]) => ["Student Attendance", "Staff Attendance", "Attendance Administration"].includes(label))} onOpen={openRoute} />
                <AdminCategorySection active={activeAdminCategory === "finance"} onToggle={() => setActiveAdminCategory(activeAdminCategory === "finance" ? null : "finance")} title="Finance" items={adminTools.filter(([label]) => ["Fee structures", "Finance ledger", "Payment intents", "Staff finance", "Staff finance report", "Staff loan repayments"].includes(label))} onOpen={openRoute} />
                <AdminCategorySection active={activeAdminCategory === "ai"} onToggle={() => setActiveAdminCategory(activeAdminCategory === "ai" ? null : "ai")} title="AI tools" items={adminTools.filter(([label]) => ["AI budget alerts", "AI cost controls", "AI usage report", "AI grading audit"].includes(label))} onOpen={openRoute} />
                <AdminCategorySection active={activeAdminCategory === "school"} onToggle={() => setActiveAdminCategory(activeAdminCategory === "school" ? null : "school")} title="School administration" items={adminTools.filter(([label]) => !["Students", "Academic years", "Academic terms", "Grading configuration", "Student rankings", "Student Attendance", "Staff Attendance", "Attendance Administration", "Fee structures", "Finance ledger", "Payment intents", "Staff finance", "Staff finance report", "Staff loan repayments", "AI budget alerts", "AI cost controls", "AI usage report", "AI grading audit"].includes(label))} onOpen={openRoute} />
              </>
            )}
          </View>
        )}

        {!!role && role !== "admin" && role !== "superadmin" && (
          <View className="mt-6">
            <Text className="text-lg font-extrabold text-slate-900">School updates</Text>
            <Text className="mt-1 text-sm text-slate-500">
              Shared notices, events, and account alerts.
            </Text>
            {sharedTools.map(([label, detail, route]) => (
              <Pressable
                className="mt-3 rounded-3xl border border-slate-200 bg-white p-5 active:bg-slate-50"
                key={route}
                onPress={() => router.push(route)}
              >
                <Text className="text-base font-extrabold text-slate-900">{label}</Text>
                <Text className="mt-1 text-sm text-slate-500">{detail}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <View className="mt-6 rounded-3xl border border-slate-200 bg-white p-5">
          <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Signed-in profile
          </Text>
          <Text className="mt-3 text-base font-bold text-slate-900">
            {displayName || user.email}
          </Text>
          <Text className="mt-1 text-sm capitalize text-slate-500">
            {role || "No role assigned"}
          </Text>
        </View>

        <View className="mt-4 rounded-3xl border border-slate-200 bg-white p-5">
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-xs font-bold uppercase tracking-widest text-slate-500">
                Offline sync
              </Text>
              <Text
                className={`mt-2 text-base font-bold ${
                  status === "pending" ? "text-amber-700" : "text-emerald-700"
                }`}
              >
                {status === "syncing"
                  ? "Syncing..."
                  : status === "pending"
                    ? "Waiting to sync"
                    : "Ready"}
              </Text>
            </View>
            <View className="rounded-2xl bg-slate-100 px-4 py-3">
              <Text className="text-center text-xl font-black text-slate-900">
                {pendingCount}
              </Text>
              <Text className="text-xs font-semibold text-slate-500">pending</Text>
            </View>
          </View>
          <Text className="mt-3 text-sm leading-5 text-slate-500">
            {lastSyncedAt
              ? `Last sync: ${new Date(lastSyncedAt).toLocaleString()}`
              : "Queued changes will be sent when a connection is available."}
          </Text>
          <Pressable
            className="mt-4 items-center rounded-2xl bg-slate-900 px-4 py-3 active:bg-slate-700"
            disabled={status === "syncing"}
            onPress={syncNow}
          >
            <Text className="text-sm font-bold text-white">Sync now</Text>
          </Pressable>
        </View>

        <Pressable
          className="mt-6 items-center rounded-2xl border border-red-200 bg-red-50 px-4 py-4 active:bg-red-100"
          onPress={logout}
        >
          <Text className="text-base font-bold text-red-700">Sign out</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}
