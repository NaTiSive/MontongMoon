// src/pages/owner/OwnerOffers.jsx
import { useEffect, useMemo, useState } from "react";
import Sidebar from "../../components/Sidebar";
import { useAuth } from "../../contexts/AuthContext";
import Card from "../../components/Card";
import PageHeader from "../../components/PageHeader";
import DataTable from "../../components/datatable";
import PrimaryButton from "../../components/PrimaryButton";
import SecondaryButton from "../../components/SecondaryButton";
import HeaderWrapper from "../../components/HeaderWrapper";
import { listAllContracts, approveContract, rejectContract } from "../../api/contracts";

export default function OwnerOffers() {
  const { user } = useAuth();
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState(null);
  const ownerId = 1; // Owner หลักของระบบ

  // โหลดรายการข้อเสนอ
  async function reload() {
    setLoading(true);
    try {
      const all = await listAllContracts();
      const filtered = all.filter(
        (o) => o.owner_id === ownerId && o.status === "รอการพิจารณา"
      );
      setOffers(filtered);
    } catch (err) {
      console.error("Error loading contracts:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    reload();
  }, []);

  // โครง columns ของตาราง
  const columns = useMemo(
    () => [
      { key: "contract_id", header: "สัญญา" },
      { key: "broker_name", header: "ผู้รับเหมา" },
      { key: "quantity", header: "ปริมาณ (กก.)" },
      { key: "offer_price", header: "ราคาเสนอ (฿/กก.)" },
      { key: "payment_term", header: "วิธีจ่าย" },
      { key: "submitted_at", header: "วันที่ยื่น" },
    ],
    []
  );

  // กด “อนุมัติ”
  async function handleApprove(id) {
    try {
      setActionId(id);
      await approveContract(id);
      await reload();
    } catch (err) {
      console.error("Approve error:", err);
    } finally {
      setActionId(null);
    }
  }

  // กด “ปฏิเสธ”
  async function handleReject(id) {
    try {
      setActionId(id);
      await rejectContract(id);
      await reload();
    } catch (err) {
      console.error("Reject error:", err);
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <HeaderWrapper
        title="ข้อเสนอจากผู้รับเหมา"
        subtitle="อนุมัติหรือปฏิเสธข้อเสนอที่รอการพิจารณา"
      />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 pt-28 px-4 md:px-6">
          <Card>
            <PageHeader
              title="รายการข้อเสนอ (รอการพิจารณา)"
              subtitle={`พบ ${offers.length} รายการ`}
            />

            {loading ? (
              <div className="py-12 text-center text-gray-500">
                กำลังโหลดข้อมูล...
              </div>
            ) : (
              <DataTable
                columns={columns}
                data={offers}
                emptyText="ยังไม่มีข้อเสนอที่รอการพิจารณา"
                renderRowActions={(row) => (
                  <div className="flex justify-end gap-2">
                    <SecondaryButton
                      title="ปฏิเสธ"
                      onClick={() => handleReject(row.contract_id)}
                      disabled={actionId === row.contract_id}
                    />
                    <PrimaryButton
                      title="อนุมัติ"
                      onClick={() => handleApprove(row.contract_id)}
                      disabled={actionId === row.contract_id}
                    />
                  </div>
                )}
              />
            )}
          </Card>
        </main>
      </div>
    </div>
  );
}
