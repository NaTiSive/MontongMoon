import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";

export default function OwnerTransactions() {
  const [transactions] = useState([
    {
      id: 1,
      datetime: "2025-09-20T11:46:09",
      user: "jame",
      type: "รายจ่าย",
      method: "โอนเงิน",
      amount: 50,
      status: "อนุมัติแล้ว",
    },
    {
      id: 1,
      datetime: "2025-09-20T11:46:09",
      user: "jame",
      type: "รายจ่าย",
      method: "โอนเงิน",
      amount: 50,
      status: "อนุมัติ",
    },
    {
      id: 1,
      datetime: "2025-09-20T11:46:09",
      user: "jame",
      type: "รายจ่าย",
      method: "โอนเงิน",
      amount: 50,
      status: "ปฏิเสธ",
    },
  ]);

  const sumApprovedIn = 0.0;
  const sumApprovedOut = 50.0;
  const balance = sumApprovedIn - sumApprovedOut;

  const thb = (n) =>
    n.toLocaleString("th-TH", {
      style: "currency",
      currency: "THB",
      minimumFractionDigits: 2,
    });

  const fmt = (iso) =>
    new Date(iso).toLocaleString("th-TH", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });

  const StatusBadge = ({ text }) => {
    const map = {
      อนุมัติแล้ว: "bg-green-800 text-white",
      อนุมัติ: "bg-green-100 text-green-700 border border-green-400",
      ปฏิเสธ: "bg-amber-100 text-amber-700 border border-amber-400",
    };
    return (
      <span
        className={`px-3 py-1 rounded-lg text-xs font-medium ${
          map[text] || ""
        }`}
      >
        {text}
      </span>
    );
  };

  const SummaryCard = ({ label, value, color }) => (
    <div className={`rounded-2xl shadow-sm px-6 py-5 ${color.bg}`}>
      <div className={`text-sm font-medium ${color.text}`}>{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${color.text}`}>
        {thb(value)}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-900 flex">
      {/* Sidebar */}
      <div className="hidden md:block w-56 lg:w-64 shrink-0 sticky top-0 h-screen bg-white shadow-md">
        <Sidebar />
      </div>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Header
          title="รายรับ / รายจ่ายของสวน"
          subtitle="ตรวจสอบและยืนยันรายการจากผู้รับเหมา พร้อมดูสรุปภาพรวม"
          name="สมชาย เปี่ยมชัย"
          role="เจ้าของสวน"
        />

        <main className="p-4 sm:p-6 space-y-6">
          {/* การ์ดสรุปยอดรวม */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <SummaryCard
              label="รายรับที่อนุมัติแล้ว"
              value={sumApprovedIn}
              color={{ bg: "bg-emerald-50", text: "text-emerald-700" }}
            />
            <SummaryCard
              label="รายจ่ายที่อนุมัติแล้ว"
              value={sumApprovedOut}
              color={{ bg: "bg-rose-50", text: "text-rose-700" }}
            />
            <SummaryCard
              label="คงเหลือสุทธิ"
              value={balance}
              color={{ bg: "bg-lime-50", text: "text-lime-700" }}
            />
          </div>

          {/* ตารางรายการ */}
          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-emerald-50 text-slate-700 text-left">
                    <th className="py-2 px-3 rounded-l-lg">วันที่</th>
                    <th className="py-2 px-3">ผู้บันทึก</th>
                    <th className="py-2 px-3">ประเภท</th>
                    <th className="py-2 px-3">จำนวนเงิน</th>
                    <th className="py-2 px-3">วิธีชำระ</th>
                    <th className="py-2 px-3">สถานะ</th>
                    <th className="py-2 px-3 rounded-r-lg text-center">
                      การยืนยัน
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((t) => (
                    <tr
                      key={t.id}
                      className="border-t bg-white hover:bg-slate-50"
                    >
                      <td className="py-2 px-3">{fmt(t.datetime)}</td>
                      <td className="py-2 px-3">{t.user}</td>
                      <td className="py-2 px-3">{t.type}</td>
                      <td className="py-2 px-3">{thb(t.amount)}</td>
                      <td className="py-2 px-3">{t.method}</td>
                      <td className="py-2 px-3">
                        <StatusBadge text={t.status} />
                      </td>
                      <td className="py-2 px-3 flex gap-2 justify-center">
                        <button className="px-3 py-1 rounded-lg bg-green-700 text-white text-xs hover:bg-green-800">
                          อนุมัติ
                        </button>
                        <button className="px-3 py-1 rounded-lg bg-amber-400 text-white text-xs hover:bg-amber-500">
                          ปฏิเสธ
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </main>
      </div>
    </div>
  );
}
