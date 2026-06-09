import OperationalDashboard from "../../components/OperationalDashboard";

export default function SuperAdminDashboard() {
  return (
    <OperationalDashboard
      showAccountMetrics
      subtitle="Review school-wide operations and account registry health from one control surface."
      title="Super admin dashboard"
    />
  );
}
