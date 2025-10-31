// src/App.jsx
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext";

// --- Auth pages ---
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Profile from "./pages/Profile";

// --- Broker pages ---
import BrokerDashboard from "./pages/broker/BrokerDashboard";
import BrokerSubmitOffer from "./pages/broker/BrokerSubmitOffer";
import BrokerHarvest from "./pages/broker/BrokerHarvest";
import BrokerReportProblem from "./pages/broker/BrokerReportProblem";
import BrokerTransaction from "./pages/broker/BrokerTransaction";
import BrokerActivity from "./pages/broker/BrokerActivity";
import BrokerExportConfirm from "./pages/broker/BrokerExportConfirm";

// --- Owner pages ---
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerOffers from "./pages/owner/OwnerOffers";
import OwnerTreeStatus from "./pages/owner/OwnerTreeStatus";
import OwnerHarvest from "./pages/owner/OwnerHarvest";
import OwnerTransactions from "./pages/owner/OwnerTransactions";
import OwnerProblems from "./pages/owner/OwnerProblems";
import OwnerActivities from "./pages/owner/OwnerActivities";
import OwnerProcessing from "./pages/owner/OwnerProcessing";
import OwnerExportConfirm from "./pages/owner/OwnerExportConfirm";

function ProtectedRoute({ role }) {
  const { user, loading } = useAuth();

  if (loading)
    return (
      <div className="h-screen flex items-center justify-center text-gray-600">
        กำลังตรวจสอบสิทธิ์ผู้ใช้งาน...
      </div>
    );

  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={`/${user.role}/dashboard`} replace />;
  return <Outlet />;
}

function ApprovalGuard() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "broker") return <Navigate to={`/${user.role}/dashboard`} replace />;

  const approval = String(user.approvalStatus ?? "").trim().toLowerCase();
  const approvedStates = [
    "approved",
    "อนุมัติ",
    "อนุมัติแล้ว",
    "ผ่านการอนุมัติ",
    "ยอมรับ",
    "ยืนยัน",
  ];
  const isApproved = approvedStates.some((state) => approval.includes(state));
  if (!isApproved) {
    return <Navigate to="/broker/dashboard" replace />;
  }
  return <Outlet />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />

      {/* Auth routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile" element={<Profile />} />

      {/* Owner group */}
      <Route element={<ProtectedRoute role="owner" />}>
        <Route path="/owner/dashboard" element={<OwnerDashboard />} />
        <Route path="/owner/offers" element={<OwnerOffers />} />
        <Route path="/owner/treestatus" element={<OwnerTreeStatus />} />
        <Route path="/owner/harvest" element={<OwnerHarvest />} />
        <Route path="/owner/transaction" element={<OwnerTransactions />} />
        <Route path="/owner/problems" element={<OwnerProblems />} />
        <Route path="/owner/activities" element={<OwnerActivities />} />
        <Route path="/owner/processing" element={<OwnerProcessing />} />
        <Route path="/owner/export-confirm" element={<OwnerExportConfirm />} />
      </Route>

      {/* Broker group */}
      <Route element={<ProtectedRoute role="broker" />}>
        <Route path="/broker/dashboard" element={<BrokerDashboard />} />
        <Route path="/broker/offers" element={<BrokerSubmitOffer />} />
        <Route path="/broker/export-confirm" element={<BrokerExportConfirm />} />

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
