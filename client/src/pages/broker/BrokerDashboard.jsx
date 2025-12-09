// src/pages/broker/BrokerDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import HeaderWrapper from "../../components/HeaderWrapper";
import Sidebar from "../../components/Sidebar";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import { isApprovedStatus } from "../../utils/approval";
import { getOwnerDeadline, listBrokerContracts } from "../../api/contracts";
import { useNavigate } from "react-router-dom";

export default function BrokerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [myOffers, setMyOffers] = useState([]);
  const [deadline, setDeadline] = useState(null);

  // โหลดข้อเสนอของ broker คนนี้
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const mine = await listBrokerContracts(user?.broker_id);
        if (!alive) return;
        const onlyMine = (mine || []).filter((offer) =>
          user?.broker_id ? offer.broker_id === user.broker_id : true
        );
        setMyOffers(onlyMine);
      } catch (err) {
        if (!alive) return;
        console.error("Error loading contracts:", err);
      }
    }
    if (user?.broker_id) {
      load();
    } else {
      setMyOffers([]);
    }
    return () => {
      alive = false;
    };
  }, [user?.broker_id]);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await getOwnerDeadline();
        if (!alive) return;
        setDeadline(res?.current_deadline_date ?? null);
      } catch (err) {
        if (!alive) return;
        console.error("Error loading deadline:", err);
        setDeadline(null);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // สถิติ
  const stat = useMemo(() => {
    const pending = myOffers.filter((o) => o.status === "รอการพิจารณา").length;
    const approved = myOffers.filter((o) => o.status === "ยอมรับ").length;
    return { pending, approved };
  }, [myOffers]);

  const pendingOffers = useMemo(
    () => myOffers.filter((o) => o.status === "รอการพิจารณา"),
    [myOffers]
  );

  const deadlineText = useMemo(() => {
    if (!deadline) return "ยังไม่มีกำหนดปิดรับข้อเสนอ";
    const d = new Date(deadline);
    if (Number.isNaN(d.getTime())) return "รูปแบบวันปิดรับข้อเสนอไม่ถูกต้อง";
    return d.toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
  }, [deadline]);

  const formatSubmittedDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("th-TH", { dateStyle: "medium" });
  };

  return (
    <div
      className={`min-h-screen w-full bg-slate-50 text-slate-900 flex flex-col md:flex-row ${
        isSidebarOpen ? "overflow-hidden md:overflow-auto" : ""
      }`}
    >
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className="flex-1 min-w-0 flex flex-col">
        <HeaderWrapper
          onMenuClick={() => setIsSidebarOpen(true)}
          title="แดชบอร์ดผู้รับเหมา"
          subtitle={
            isApprovedStatus(user?.approvalStatus)
              ? "สถานะ: อนุมัติแล้ว"
              : "สถานะ: รอการอนุมัติ"
          }
        />

        <main className="flex-1 px-4 md:px-6 pt-28 pb-6">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <Card>
                <h2 className="text-lg font-semibold mb-3">ข้อเสนอของฉัน</h2>
                <div className="text-sm text-gray-600 space-y-1 mb-4">
                  <p>รอพิจารณา {stat.pending} รายการ</p>
                  <p>ยอมรับแล้ว {stat.approved} รายการ</p>
                </div>
                <PrimaryButton
                  title="ยื่นข้อเสนอใหม่"
                  onClick={() => navigate("/broker/offers")}
                />
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-2">สถานะอนุมัติ</h2>
                <p className="text-sm text-gray-600">
                  ปัจจุบัน:{" "}
                  {isApprovedStatus(user?.approvalStatus)
                    ? "อนุมัติแล้ว"
                    : "รอการอนุมัติ"}
                </p>
              </Card>

              <Card>
                <h2 className="text-lg font-semibold mb-2">กำหนดปิดรับข้อเสนอ</h2>
                <p className="text-sm text-gray-600">{deadlineText}</p>
                <p className="text-xs text-gray-500 mt-2">
                  * เมื่อถึงกำหนดจะไม่สามารถยื่นข้อเสนอรอบนี้ได้
                </p>
              </Card>
            </div>

            <Card>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-semibold">ข้อเสนอที่รอการพิจารณา</h3>
                <span className="text-sm text-gray-500">
                  ทั้งหมด {pendingOffers.length} รายการ
                </span>
              </div>

              <div className="mt-4 space-y-3">
                {pendingOffers.length === 0 ? (
                  <p className="text-sm text-gray-600">
                    ยังไม่มีข้อเสนอของคุณที่รอการพิจารณาในขณะนี้
                  </p>
                ) : (
                  pendingOffers.map((offer) => (
                    <div
                      key={offer.contract_id}
                      className="border border-slate-200 rounded-lg bg-white/70 p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          #{offer.contract_id} • เจ้าของสวน {offer.owner_id ?? "-"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          ส่งเมื่อ {formatSubmittedDate(offer.contract_date)}
                        </p>
                      </div>

                      <div className="text-sm text-slate-600">
                        ประมาณการผลผลิต: {offer.qtt_estimate ?? "-"} ตัน
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
