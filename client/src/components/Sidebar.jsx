import { NavLink, useNavigate } from "react-router-dom";
import { MdDashboard, MdLogout } from "react-icons/md";
import { IoPricetag, IoWarning } from "react-icons/io5";
import { RiTreeFill } from "react-icons/ri";
import { FaClipboardList } from "react-icons/fa";
import { AiFillDollarCircle } from "react-icons/ai";
import { LuListTodo } from "react-icons/lu";
import { useAuth } from "../contexts/AuthContext";

export default function Sidebar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  if (!user) return null;

  const status = String(user.approvalStatus || "pending").toLowerCase();
  const isApproved = status === "approved";

  const ownerMenu = [
    { id: "dashboard", name: "แดชบอร์ด", icon: <MdDashboard size={18} />, to: "/owner/dashboard" },
    { id: "offers", name: "ข้อเสนอ", icon: <IoPricetag size={18} />, to: "/owner/offers" },
    { id: "treestatus", name: "สถานะต้นทุเรียน", icon: <RiTreeFill size={18} />, to: "/owner/treestatus" },
    { id: "harvest", name: "ผลการเก็บเกี่ยว", icon: <FaClipboardList size={18} />, to: "/owner/harvest" },
    { id: "transaction", name: "รายรับรายจ่าย", icon: <AiFillDollarCircle size={18} />, to: "/owner/transaction" },
    { id: "problems", name: "ปัญหา", icon: <IoWarning size={18} />, to: "/owner/problems" },
    { id: "activities", name: "กิจกรรม", icon: <LuListTodo size={18} />, to: "/owner/activities" },
  ];

  const brokerPendingMenu = [
    { id: "dashboard", name: "แดชบอร์ด", icon: <MdDashboard size={18} />, to: "/broker/dashboard" },
    { id: "offers", name: "ยื่นข้อเสนอ", icon: <IoPricetag size={18} />, to: "/broker/offers" },
  ];

  const brokerApprovedMenu = [
    { id: "dashboard", name: "แดชบอร์ด", icon: <MdDashboard size={18} />, to: "/broker/dashboard" },
    { id: "offers", name: "ยื่นข้อเสนอ", icon: <IoPricetag size={18} />, to: "/broker/offers" },
    { id: "harvest", name: "ผลการเก็บเกี่ยว", icon: <FaClipboardList size={18} />, to: "/broker/harvest" },
    { id: "transaction", name: "ธุรกรรม", icon: <AiFillDollarCircle size={18} />, to: "/broker/transaction" },
    { id: "problems", name: "รายงานปัญหา", icon: <IoWarning size={18} />, to: "/broker/problems" },
    { id: "activity", name: "กิจกรรม", icon: <LuListTodo size={18} />, to: "/broker/activity" },
  ];

  const menu = user.role === "owner" ? ownerMenu : isApproved ? brokerApprovedMenu : brokerPendingMenu;

  return (
    <aside className="h-screen w-56 bg-green-800 text-white flex flex-col justify-between">
      <div>
        <div className="flex items-center gap-2 px-3 py-3">
          <img src="/Logo.png" alt="MonthongMoon" className="w-10 h-10 rounded-md" />
          <div>
            <h1 className="font-semibold text-base">MonthongMoon</h1>
            <p className="text-xs opacity-80">
              {user.role === "owner"
                ? "เจ้าของสวน"
                : isApproved
                ? "นายหน้า (ผ่านอนุมัติ)"
                : "นายหน้า (รออนุมัติ)"}
            </p>
          </div>
        </div>

        <nav className="mt-2 flex flex-col gap-1">
          {menu.map((item) => (
            <NavLink
              key={item.id}
              to={item.to}
              className={({ isActive }) =>
                `flex items-center gap-3 py-2 px-4 rounded-md mx-2 text-sm font-medium transition-all ${
                  isActive ? "bg-yellow-400 text-black" : "hover:bg-green-700"
                }`
              }
            >
              <span>{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="p-4">
        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
          }}
          className="w-full flex items-center gap-3 py-2 px-3 rounded-md hover:bg-green-700 text-sm"
        >
          <MdLogout />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
