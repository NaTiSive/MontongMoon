import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { MdDashboard, MdLogout } from "react-icons/md";
import { IoPricetag, IoWarning } from "react-icons/io5";
import { RiTreeFill } from "react-icons/ri";
import { FaClipboardList } from "react-icons/fa";
import { AiFillDollarCircle } from "react-icons/ai";
import { LuListTodo } from "react-icons/lu";

export default function Sidebar({ isOpen = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  if (!user) return null;

  // ===== MENU BY ROLE =====
  let menu = [];
  if (user.role === "owner") {
    menu = [
      { id: "dashboard",    name: "แดชบอร์ด",       path: "/owner/dashboard",   icon: <MdDashboard size={18} /> },
      { id: "offers",       name: "ข้อเสนอ",         path: "/owner/offers",      icon: <IoPricetag size={18} /> },
      { id: "treestatus",   name: "สถานะต้นทุเรียน", path: "/owner/treestatus", icon: <RiTreeFill size={18} /> },
      { id: "harvest",      name: "ผลการเก็บเกี่ยว", path: "/owner/harvest",    icon: <FaClipboardList size={18} /> },
      // ✅ เพิ่มเมนูแปรรูปทุเรียน
      { id: "processing",   name: "แปรรูปทุเรียน",   path: "/owner/processing", icon: <FaClipboardList size={18} /> },
      { id: "transactions", name: "รายรับรายจ่าย",    path: "/owner/transaction", icon: <AiFillDollarCircle size={18} /> },
      { id: "problems",     name: "ปัญหา",            path: "/owner/problems",   icon: <IoWarning size={18} /> },
      { id: "activities",   name: "กิจกรรม",          path: "/owner/activities", icon: <LuListTodo size={18} /> },
    ];
  } else if (user.role === "broker") {
    if (user.approvalStatus === "pending") {
      menu = [
        { id: "dashboard",   name: "แดชบอร์ด",    path: "/broker/dashboard",  icon: <MdDashboard size={18} /> },
        { id: "submitoffer", name: "ยื่นข้อเสนอ", path: "/broker/offers",     icon: <IoPricetag size={18} /> },
      ];
    } else {
      menu = [
        { id: "dashboard",   name: "แดชบอร์ด",     path: "/broker/dashboard",   icon: <MdDashboard size={18} /> },
        { id: "submitoffer", name: "ยื่นข้อเสนอ",  path: "/broker/offers",      icon: <IoPricetag size={18} /> },
        { id: "harvest",     name: "ผลการเก็บเกี่ยว", path: "/broker/harvest", icon: <FaClipboardList size={18} /> },
        { id: "transactions",name: "รายรับรายจ่าย",   path: "/broker/transaction", icon: <AiFillDollarCircle size={18} /> },
        { id: "problems",    name: "รายงานปัญหา",   path: "/broker/problems",  icon: <IoWarning size={18} /> },
        { id: "activities",  name: "กิจกรรม",       path: "/broker/activity",   icon: <LuListTodo size={18} /> },
      ];
    }
  }

  const renderMenu = (isMobile = false) => (
    <>
      <div className="flex items-center px-4 py-3">
        <img src="/Logo.png" alt="MonthongMoon" className="w-12 h-12 mr-2" />
        <h1 className="font-semibold text-base">MonthongMoon</h1>
      </div>

      <nav className="mt-1 flex flex-col gap-1">
        {menu.map((item) => {
          const isActive = location.pathname.startsWith(item.path);
          return (
            <button
              key={item.id}
              onClick={() => {
                navigate(item.path);
                if (isMobile) onClose();
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

      <div className="p-4 mt-auto">
        <button
          onClick={() => {
            logout();
            navigate("/login", { replace: true });
            if (isMobile) onClose();
          }}
          className="w-full text-left flex items-center gap-3 py-2 px-3 rounded-md hover:bg-green-700 text-sm"
        >
          <MdLogout />
          ออกจากระบบ
        </button>
      </div>
    </>
  );

  return (
    <aside>
      {/* Mobile: Drawer (fixed) */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-green-800 text-white transform transition-transform duration-200 md:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex flex-col h-full">{renderMenu(true)}</div>
      </div>

      {/* Desktop: Sticky sidebar */}
      <div className="hidden md:flex md:flex-col md:w-64 md:bg-green-800 md:text-white md:sticky md:top-0 md:h-screen md:overflow-y-auto">
        {renderMenu(false)}
      </div>
    </aside>
  );
}
