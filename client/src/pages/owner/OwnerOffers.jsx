import React, { useEffect, useState } from "react";
import Sidebar from "../../components/Sidebar";
import HeaderWrapper from "../../components/HeaderWrapper";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { listAllContracts, approveContract, rejectContract } from "../../api/contracts";

export default function OwnerOffers() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (!user || user.role !== "owner") navigate("/login");
  }, [user, navigate]);

  useEffect(() => {
    (async () => {
      const all = await listAllContracts();
      setRows(all);
    })();
  }, []);

  const reload = async () => {
    const all = await listAllContracts();
    setRows(all);
  };

  return (
    <div className={`min-h-screen w-full bg-slate-50 flex flex-col md:flex-row ${isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""}`}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)} />}
      <div className="flex-1 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="ข้อเสนอจากนายหน้า"
          subtitle="ตรวจสอบและเลือกข้อเสนอที่ต้องการ"
        />

        <main className="p-4 sm:p-6 pt-28">
          <div className="max-w-5xl mx-auto space-y-4">
            {rows.length === 0 ? (
              <Card>ยังไม่มีข้อเสนอ</Card>
            ) : (
              rows.map((row) => (
                <Card key={row.contract_id} className="space-y-1">
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="font-semibold">
                        #{row.contract_id.slice(0, 8)} • Broker {row.broker_id}
                      </div>
                      <div className="text-xs text-slate-500">
                        ส่งเมื่อ {new Date(row.contract_date).toLocaleString("th-TH")}
                      </div>
                    </div>
                    <span
                      className={`px-3 py-1 rounded-lg text-xs font-medium ${
                        row.status === "ยอมรับ"
                          ? "bg-emerald-100 text-emerald-700"
                          : row.status === "ปฏิเสธ"
                          ? "bg-rose-100 text-rose-700"
                          : "bg-amber-100 text-amber-700"
                      }`}
                    >
                      {row.status}
                    </span>
                  </div>

                  {/* แสดงราคาตามเกรด */}
                  {row.offerprice_by_grade && (
                    <div className="text-xs text-slate-600 mt-1">
                      A={row.offerprice_by_grade.A} / B={row.offerprice_by_grade.B} / C={row.offerprice_by_grade.C} บาท/กก.
                    </div>
                  )}

                  {/* ปุ่มจัดการ */}
                  <div className="flex gap-2 mt-2">
                    <button
                      onClick={async () => {
                        await approveContract(row.contract_id);
                        await reload();
                        alert("อนุมัติข้อเสนอแล้ว (เลือกได้ครั้งละ 1 รายการ)");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-700 text-white text-xs hover:bg-emerald-800"
                    >
                      อนุมัติ
                    </button>
                    <button
                      onClick={async () => {
                        await rejectContract(row.contract_id);
                        await reload();
                        alert("ปฏิเสธข้อเสนอแล้ว");
                      }}
                      className="px-3 py-1.5 rounded-lg bg-rose-700 text-white text-xs hover:bg-rose-800"
                    >
                      ปฏิเสธ
                    </button>
                  </div>

                  {row.note && (
                    <div className="text-xs text-slate-500 mt-1">
                      หมายเหตุ: {row.note}
                    </div>
                  )}
                </Card>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
