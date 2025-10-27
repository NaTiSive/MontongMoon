import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MdDashboard, MdLogout } from "react-icons/md";
import { IoPricetag, IoWarning } from "react-icons/io5";
import { RiTreeFill } from "react-icons/ri";
import { FaClipboardList } from "react-icons/fa";
import { AiFillDollarCircle } from "react-icons/ai";
import { LuListTodo } from "react-icons/lu";
import "./Sidebar.css";

export default function Sidebar({ isOpen, onClose }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null; // ป้องกัน error ตอน refresh

  // ===== MENU BY ROLE =====
  let menu = [];
  if (user.role === "owner") {
    menu = [
      { id: "dashboard", name: "แดชบอร์ด", path: "/owner/dashboard", icon: <MdDashboard size={18} /> },
      { id: "offers", name: "ข้อเสนอ", path: "/owner/offers", icon: <IoPricetag size={18} /> },
      { id: "treestatus", name: "สถานะต้นทุเรียน", path: "/owner/treestatus", icon: <RiTreeFill size={18} /> },
      { id: "harvest", name: "ผลการเก็บเกี่ยว", path: "/owner/harvest", icon: <FaClipboardList size={18} /> },
      { id: "transactions", name: "รายรับรายจ่าย", path: "/owner/transaction", icon: <AiFillDollarCircle size={18} /> },
      { id: "problems", name: "ปัญหา", path: "/owner/problems", icon: <IoWarning size={18} /> },
      { id: "activities", name: "กิจกรรม", path: "/owner/activities", icon: <LuListTodo size={18} /> },
    ];
  } else if (user.role === "broker") {
    if (user.approvalStatus === "pending") {
      menu = [
        { id: "dashboard", name: "แดชบอร์ด", path: "/broker/dashboard", icon: <MdDashboard size={18} /> },
        { id: "submitoffer", name: "ยื่นข้อเสนอ", path: "/broker/offers", icon: <IoPricetag size={18} /> },
      ];
    } else {
      menu = [
        { id: "dashboard", name: "แดชบอร์ด", path: "/broker/dashboard", icon: <MdDashboard size={18} /> },
        { id: "submitoffer", name: "ยื่นข้อเสนอ", path: "/broker/offers", icon: <IoPricetag size={18} /> },
        { id: "harvest", name: "ผลการเก็บเกี่ยว", path: "/broker/harvest", icon: <FaClipboardList size={18} /> },
        { id: "transactions", name: "รายรับรายจ่าย", path: "/broker/transaction", icon: <AiFillDollarCircle size={18} /> },
        { id: "problems", name: "รายงานปัญหา", path: "/broker/problems", icon: <IoWarning size={18} /> },
        { id: "activities", name: "กิจกรรม", path: "/broker/activity", icon: <LuListTodo size={18} /> },
      ];
    }
  }

  return (
    <aside
      className={`fixed md:static top-0 left-0 h-screen w-56 bg-green-800 text-white flex flex-col justify-between transform transition-transform duration-300 z-50
      ${isOpen ? "translate-x-0" : "-translate-x-full"} md:translate-x-0`}
    >
      {/* ปุ่มปิด (เฉพาะ mobile) */}
      <button
        onClick={onClose}
        className="absolute top-3 right-3 text-white text-2xl md:hidden"
      >
        ✕
      </button>

      {/* ส่วนบน: โลโก้ + เมนู */}
      <div>
        <div className="flex items-center mt-6 px-4">
          <img src="/Logo.png" alt="MonthongMoon" className="w-16 h-16" />
          <h1 className="font-semibold text-lg ml-2">MonthongMoon</h1>
        </div>

        <nav className="mt-4 flex flex-col gap-1">
          {menu.map((item) => {
            const isActive = location.pathname.startsWith(item.path);
            return (
              <button
                key={item.id}
                onClick={() => {
                  navigate(item.path);
                  onClose?.(); // ปิด sidebar หลังเลือกหน้า
                }}
                className={`flex items-center gap-3 py-2 px-4 rounded-md mx-2 text-sm font-medium transition-all ${
                  isActive ? "bg-yellow-400 text-black" : "hover:bg-green-700"
                }`}
              >
                <span>{item.icon}</span>
                <span>{item.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* ส่วนล่าง: logout */}
      <div className="p-4">
        <button
          onClick={() => {
            logout();
            localStorage.removeItem("user");
            navigate("/login", { replace: true });
          }}
          className="w-full text-left flex items-center gap-3 py-2 px-3 rounded-md hover:bg-green-700 text-sm"
        >
          <MdLogout />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
