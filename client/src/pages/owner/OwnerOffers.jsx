import React, { useState } from "react";
import Sidebar from "../../components/Sidebar";
import Header from "../../components/Header";
import Card from "../../components/Card";
import { useAuth } from "../../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";
import HeaderWrapper from "../../components/HeaderWrapper";

export default function OwnerOffers({ deadline = "2025-10-04T07:00" }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "owner") {
      navigate("/login");
    }
  }, [user, navigate]);
  const [search, setSearch] = useState("");

  const [offers, setOffers] = useState([
    {
      id: 1,
      name: "jame",
      sentDate: "19/9/2568 23:05:57",
      contactDate: "24/9/2568",
      price: "100 บาท/กิโลกรัม",
      qty: "500 กิโลกรัม",
      payment: "โอนเงิน",
      email: "name@email.com",
      phone: "0812345678",
      location: "Bangkok",
      note: "เนื่องจากว่า...",
      status: "รอดำเนินการ",
    },
    {
      id: 2,
      name: "anan",
      sentDate: "20/9/2568 12:00:00",
      contactDate: "25/9/2568",
      price: "95 บาท/กิโลกรัม",
      qty: "400 กิโลกรัม",
      payment: "เงินสด",
      email: "anan@email.com",
      phone: "0819876543",
      location: "Chanthaburi",
      note: "",
      status: "ยอมรับแล้ว",
    },
    {
      id: 3,
      name: "robert",
      sentDate: "20/9/2568 12:00:00",
      contactDate: "25/9/2568",
      price: "95 บาท/กิโลกรัม",
      qty: "400 กิโลกรัม",
      payment: "เงินสด",
      email: "anan@email.com",
      phone: "0819876543",
      location: "Chanthaburi",
      note: "",
      status: "ปฏิเสธแล้ว",
    },
  ]);

  const handleAccept = (id) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "ยอมรับแล้ว" } : o))
    );
  };

  const handleReject = (id) => {
    setOffers((prev) =>
      prev.map((o) => (o.id === id ? { ...o, status: "ปฏิเสธแล้ว" } : o))
    );
  };

  const filteredOffers = offers.filter((o) =>
    o.name.toLowerCase().includes(search.toLowerCase())
  );

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
          title="ข้อเสนอจากผู้รับเหมา"
          subtitle="ตรวจสอบรายละเอียดและยืนยันการทำงานกับผู้รับเหมา"
        />
        <main className="p-4 sm:p-6 pt-28 space-y-4">
          {/* แถวบน: ค้นหา + แสดงวันสิ้นสุด */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4">
            <input
              type="text"
              placeholder="ค้นหาชื่อผู้รับเหมา..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="border rounded-lg px-3 py-2 w-full sm:w-64 focus:ring-2 focus:ring-green-500 outline-none"
            />
            <p className="text-sm text-gray-500">
              เปิดรับข้อเสนอถึงวันที่{" "}
              <span className="font-semibold text-gray-800">
                {new Date(deadline).toLocaleString("th-TH", {
                  dateStyle: "long",
                  timeStyle: "short",
                })}
              </span>
            </p>
          </div>

          {/* รายการข้อเสนอ */}
          {filteredOffers.length === 0 ? (
            <div className="text-center py-10 text-gray-500 border rounded-lg bg-white shadow-sm">
              ไม่พบข้อเสนอที่ตรงกับคำค้นหา
            </div>
          ) : (
            filteredOffers.map((o) => (
              <Card key={o.id}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-800">
                      ข้อเสนอจาก {o.name}
                    </h2>
                    <p className="text-sm text-gray-500">
                      ส่งเมื่อ {o.sentDate}
                    </p>
                  </div>
                  <span
                    className={`text-sm font-medium px-3 py-1 rounded-lg ${
                      o.status === "ยอมรับแล้ว"
                        ? "bg-green-100 text-green-700"
                        : o.status === "ปฏิเสธแล้ว"
                        ? "bg-rose-100 text-rose-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {o.status}
                  </span>
                </div>

                {/* รายละเอียด */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">วันครบกำหนดติดต่อกลับ:</span>{" "}
                    {o.contactDate}
                  </p>
                  <p>
                    <span className="font-medium">ปริมาณที่ต้องการ:</span>{" "}
                    {o.qty}
                  </p>
                  <p>
                    <span className="font-medium">ราคาที่เสนอ:</span> {o.price}
                  </p>
                  <p>
                    <span className="font-medium">วิธีการชำระเงิน:</span>{" "}
                    {o.payment}
                  </p>
                  <p>
                    <span className="font-medium">เบอร์ติดต่อ:</span> {o.phone}
                  </p>
                  <p>
                    <span className="font-medium">อีเมล:</span> {o.email}
                  </p>
                  <p className="md:col-span-2">
                    <span className="font-medium">ที่อยู่:</span> {o.location}
                  </p>
                </div>

                {/* หมายเหตุ */}
                <div className="mt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">
                    หมายเหตุ
                  </p>
                  <textarea
                    value={o.note}
                    onChange={(e) =>
                      setOffers((prev) =>
                        prev.map((x) =>
                          x.id === o.id ? { ...x, note: e.target.value } : x
                        )
                      )
                    }
                    className="w-full border rounded-lg px-3 py-2 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-green-500 resize-none"
                    rows={2}
                    placeholder="เพิ่มหมายเหตุ..."
                  />
                </div>

                {/* ปุ่ม */}
                {o.status === "รอดำเนินการ" && (
                  <div className="mt-4 flex gap-3">
                    <button
                      onClick={() => handleAccept(o.id)}
                      className="px-4 py-2 rounded-lg bg-green-600 text-white text-sm hover:bg-green-700"
                    >
                      ยอมรับข้อเสนอ
                    </button>
                    <button
                      onClick={() => handleReject(o.id)}
                      className="px-4 py-2 rounded-lg border border-yellow-500 text-yellow-700 text-sm hover:bg-yellow-100"
                    >
                      ปฏิเสธข้อเสนอ
                    </button>
                  </div>
                )}
              </Card>
            ))
          )}
        </main>
      </div>
    </div>
  );
}
