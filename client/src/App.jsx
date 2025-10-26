import { useState, useEffect } from "react";
import {Routes, Route, Navigate} from "react-router-dom"
import reactLogo from "./assets/react.svg";
import "./App.css";
import axios, { formToJSON } from "axios";

//Auth page
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Signup from "./pages/Signup";

//broker page
import BrokerActivity from "./pages/broker/BrokerActivity";
import BrokerDashboard from "./pages/broker/BrokerDashbord";
import BrokerHavest from "./pages/broker/BrokerHavest";
import BrokerReportProblem from "./pages/broker/BrokerReportProblem";
import BrokerSubmitOffer from "./pages/broker/BrokerSubmitOffer";
import BrokerTransaction from "./pages/broker/BrokerTransaction";

//owner page
import OwnerActivities from "./pages/owner/OwnerActivities";
import OwnerDashboard from "./pages/owner/OwnerDashboard";
import OwnerHavest from "./pages/owner/OwnerHavest";
import OwnerOffers from "./pages/owner/OwnerOffers";
import OwnerProblems from "./pages/owner/OwnerProblems";
import OwnerTransactions from "./pages/owner/OwnerTransactions";
import OwnerTreeStatus from "./pages/owner/OwnerTreeStatus";


export default function App() {
  const [problem, setProblem] = useState("");

  return (
    <Routes>
      {/* default */}
      <Route path="/" element={<Navigate to="/signup" replace />} />

      {/* Auth  */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/profile" element={<Profile />} />

      {/* owner page */}
      <Route path="/owner/dashboard" element={<OwnerDashboard />} />
      <Route path="/owner/offers" element={<OwnerOffers />} />
      <Route path="/owner/treestatus" element={<OwnerTreeStatus />} />
      <Route path="/owner/havest" element={<OwnerHavest />} />
      <Route path="/owner/transaction" element={<OwnerTransactions />} />
      <Route path="/owner/problems" element={<OwnerProblems />} />
      <Route path="/owner/acvities" element={<OwnerActivities />} />

      {/* broker page */}
      <Route path="/broker/dashboard" element={<BrokerDashboard />} />
      <Route path="/broker/offers" element={<BrokerSubmitOffer />} />
      <Route path="/broker/havest" element={<BrokerHavest/>} />
      <Route path="/broker/transaction" element={<BrokerTransaction />} />
      <Route path="/broker/problems" element={<BrokerReportProblem />} />
      <Route path="/broker/activity" element={<BrokerActivity />} />

      {/* 404 fallback */}
      <Route path="*" element={<div className="p-6">404 ไม่พบหน้านี้</div>} />

    </Routes>
  );
}
