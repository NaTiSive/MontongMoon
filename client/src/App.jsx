import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// Auth pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";

// Broker
import BrokerDashboard from "./pages/broker/BrokerDashboard";
import BrokerSubmitOffer from "./pages/broker/BrokerSubmitOffer";
import BrokerHarvest from "./pages/broker/BrokerHarvest";
import BrokerReportProblem from "./pages/broker/BrokerReportProblem";
import BrokerTransaction from "./pages/broker/BrokerTransaction";
import BrokerActivity from "./pages/broker/BrokerActivity";

// Owner
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerOffers from "./pages/owner/OwnerOffers";
import OwnerTreeStatus from "./pages/owner/OwnerTreeStatus";
import OwnerHarvest from "./pages/owner/OwnerHarvest";
import OwnerTransactions from "./pages/owner/OwnerTransactions";
import OwnerProblems from "./pages/owner/OwnerProblems";
import OwnerActivities from "./pages/owner/OwnerActivities";

function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();

  // ✅ รอโหลด user ก่อน redirect
  if (loading) return <div className="p-6 text-center">กำลังโหลด...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role)
    return <Navigate to={`/${user.role}/dashboard`} replace />;
  return <Outlet />;
}

function ApprovalGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user.role !== "broker") return <Navigate to={`/${user.role}/dashboard`} replace />;
  if (user.approvalStatus !== "approved") return <Navigate to="/broker/dashboard" replace />;
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile" element={<Profile />} />

      {/* Owner */}
      <Route element={<ProtectedRoute role="owner" />}>
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/offers" element={<OwnerOffers />} />
        <Route path="/owner/treestatus" element={<OwnerTreeStatus />} />
        <Route path="/owner/harvest" element={<OwnerHarvest />} />
        <Route path="/owner/transaction" element={<OwnerTransactions />} />
        <Route path="/owner/problems" element={<OwnerProblems />} />
        <Route path="/owner/activities" element={<OwnerActivities />} />
      </Route>

      {/* Broker */}
      <Route element={<ProtectedRoute role="broker" />}>
        <Route path="/broker/dashboard" element={<BrokerDashboard />} />
        <Route path="/broker/offers" element={<BrokerSubmitOffer />} />
        <Route element={<ApprovalGuard />}>
          <Route path="/broker/harvest" element={<BrokerHarvest />} />
          <Route path="/broker/transaction" element={<BrokerTransaction />} />
          <Route path="/broker/problems" element={<BrokerReportProblem />} />
          <Route path="/broker/activity" element={<BrokerActivity />} />
        </Route>
      </Route>

      <Route path="*" element={<div className="p-6">404 ไม่พบหน้านี้</div>} />
    </Routes>
  );
}
