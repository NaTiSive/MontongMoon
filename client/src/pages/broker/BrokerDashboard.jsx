import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { getBrokerApprovalStatus, listBrokerContracts } from "../../api/contracts";

export default function BrokerDashboard() {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [acceptedCount, setAcceptedCount] = useState(0);

  useEffect(() => {
    if (!user || user.role !== "broker") navigate("/login");
  }, [user, navigate]);

  // sync approval status จาก mock-localStorage (กรณี owner เพิ่งอนุมัติ)
  useEffect(() => {
    if (!user) return;
    const latest = getBrokerApprovalStatus(user.broker_id);
    if (latest && latest !== user.approvalStatus) {
      updateUser({ approvalStatus: latest });
    }
  }, [user, updateUser]);

  // โหลดจำนวนข้อเสนอ (ของฉัน)
  useEffect(() => {
    let alive = true;
    (async () => {
      if (!user) return;
      const mine = await listBrokerContracts(user.broker_id);
      const p = mine.filter((c) => c.status === "รอการพิจารณา").length;
      const a = mine.filter((c) => c.status === "ยอมรับ").length;
      if (alive) {
        setPendingCount(p);
        setAcceptedCount(a);
      }
    })();
    return () => { alive = false; };
  }, [user]);

  return (
    <div className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
      isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
    }`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="แดชบอร์ดนายหน้า"
          subtitle="ภาพรวมการยื่นข้อเสนอและสถานะบัญชี"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {user?.approvalStatus === "pending" && (
              <Card>
                <div className="text-sm text-sky-700 bg-sky-50 border border-sky-200 rounded-lg p-3">
                  บัญชีของคุณยัง “รออนุมัติ” — คุณยังสามารถ <b>ยื่นข้อเสนอ</b> ได้ที่เมนู
                  <button
                    onClick={() => navigate("/broker/submit-offer")}
                    className="ml-1 underline text-sky-800"
                  >
                    ยื่นข้อเสนอ
                  </button>
                  {" "}ข้อเสนอที่ถูก “ยอมรับ” จะทำให้บัญชีของคุณได้รับการอนุมัติและใช้งานได้เต็มรูปแบบ
                </div>
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <div className="text-sm text-slate-500">สถานะบัญชี</div>
                <div className="mt-1 text-xl font-semibold">
                  {user?.approvalStatus === "approved" ? "Approved" : "Pending"}
                </div>
              </Card>
              <Card>
                <div className="text-sm text-slate-500">ข้อเสนอของฉัน (รอพิจารณา)</div>
                <div className="mt-1 text-2xl font-semibold">{pendingCount}</div>
              </Card>
              <Card>
                <div className="text-sm text-slate-500">ข้อเสนอของฉัน (ยอมรับแล้ว)</div>
                <div className="mt-1 text-2xl font-semibold">{acceptedCount}</div>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
