import { useState } from "react";
import { MdDashboard } from "react-icons/md";
import { IoPricetag, IoWarning } from "react-icons/io5";
import { RiTreeFill } from "react-icons/ri";
import { FaClipboardList } from "react-icons/fa";
import { AiFillDollarCircle } from "react-icons/ai";
import { LuListTodo } from "react-icons/lu";
import { MdLogout } from "react-icons/md";
import "./Sidebar.css";

export default function Sidebar() {
  const [active, setActive] = useState("dashboard");

  const menu = [
    { id: "dashboard", name: "แดชบอร์ด", icon: <MdDashboard size={18} /> },
    { id: "suggestion", name: "ข้อเสนอ", icon: <IoPricetag size={18} /> },
    { id: "durian", name: "สถานะต้นทุเรียน", icon: <RiTreeFill size={18} /> },
    {
      id: "harvest",
      name: "ผลการเก็บเกี่ยว",
      icon: <FaClipboardList size={18} />,
    },
    {
      id: "income",
      name: "รายรับรายจ่าย",
      icon: <AiFillDollarCircle size={18} />,
    },
    { id: "issues", name: "ปัญหา", icon: <IoWarning size={18} /> },
    { id: "activity", name: "กิจกรรม", icon: <LuListTodo size={18} /> },
  ];

  return (
    <aside className="h-screen w-56 bg-green-800 text-white flex flex-col justify-between">
      <div>
        <div className="flex items-center">
          <img src="/Logo.png" alt="MonthongMoon" className="w-20 h-20" />
          <h1 className="font-semibold text-lg">MonthongMoon</h1>
        </div>

        <nav className="mt-2 flex flex-col gap-1">
          {menu.map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => setActive(item.id)}
              className={`flex items-center gap-3 py-2 px-4 rounded-md mx-2 text-sm font-medium transition-all
              ${
                active === item.id
                  ? "bg-yellow-400 text-black"
                  : "hover:bg-green-700"
              }`}
              aria-current={active === item.id ? "page" : undefined}
            >
              <span className="shrink-0">{item.icon}</span>
              <span className="truncate">{item.name}</span>
            </button>
          ))}
        </nav>
      </div>

      <div className="p-4">
        <button
          type="button"
          className="w-full text-left flex items-center gap-3 py-2 px-3 rounded-md hover:bg-green-700 text-sm"
        >
          <MdLogout />
          ออกจากระบบ
        </button>
      </div>
    </aside>
  );
}
