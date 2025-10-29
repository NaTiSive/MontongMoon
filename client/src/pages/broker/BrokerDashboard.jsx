// src/pages/broker/BrokerDashboard.jsx
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../../contexts/AuthContext";
import HeaderWrapper from "../../components/HeaderWrapper";
import Sidebar from "../../components/Sidebar";
import Card from "../../components/Card";
import PrimaryButton from "../../components/PrimaryButton";
import { listBrokerContracts } from "../../api/contracts"; // ✅ ใช้ฟังก์ชันจริงที่มีใน API
import { useNavigate } from "react-router-dom";

export default function BrokerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [myOffers, setMyOffers] = useState([]);

  // โหลดข้อเสนอของ broker คนนี้
  useEffect(() => {
    async function load() {
      try {
        const mine = await listBrokerContracts(user?.broker_id);
        setMyOffers(mine || []);
      } catch (err) {
        console.error("Error loading contracts:", err);
      }
    }
    if (user?.broker_id) load();
  }, [user?.broker_id]);

  // สถิติ
  const stat = useMemo(() => {
    const pending = myOffers.filter((o) => o.status === "รอการพิจารณา").length;
    const approved = myOffers.filter((o) => o.status === "ยอมรับ").length;
    return { pending, approved };
  }, [myOffers]);

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderWrapper
        title="แดชบอร์ดผู้รับเหมา"
        subtitle={
          user?.approvalStatus === "approved"
            ? "สถานะ: อนุมัติแล้ว"
            : "สถานะ: รอการอนุมัติ"
        }
      />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 pt-28 px-4 md:px-6">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <h2 className="text-lg font-semibold mb-2">ข้อเสนอของฉัน</h2>
              <p className="text-sm text-gray-600 mb-4">
                รอพิจารณา {stat.pending} | ยอมรับแล้ว {stat.approved}
              </p>
              <PrimaryButton
                title="ยื่นข้อเสนอใหม่"
                onClick={() => navigate("/broker/offers")}
              />
            </Card>

            <Card>
              <h2 className="text-lg font-semibold mb-2">สถานะอนุมัติ</h2>
              <p className="text-sm text-gray-600">
                ปัจจุบัน:{" "}
                {user?.approvalStatus === "approved"
                  ? "อนุมัติแล้ว"
                  : "รอการอนุมัติ"}
              </p>
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}
