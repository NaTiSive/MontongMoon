import "./Header.css";
import { useNavigate } from "react-router-dom";

export default function Header({
  title = "แดชบอร์ดเจ้าของสวน",
  subtitle = "ติดตามภาพรวมของสวนของคุณ",
  name = "ชื่อผู้ใช้",
  role = "บทบาท",
}) {
  const navigate = useNavigate();
  return (
    <div className="sticky top-0 z-50 bg-white border-b shadow-sm flex justify-between items-center px-6 py-3">
      {/* ซ้าย: ชื่อหน้า */}
      <div>
        <h1 className="text-2xl font-semibold text-gray-800">{title}</h1>
        <p className="text-sm text-gray-600 mt-0.5">{subtitle}</p>
      </div>

      {/* ขวา: โปรไฟล์ */}
      <div className="flex items-center gap-4">
        <div className="text-right">
          <span className="block text-sm font-medium text-gray-800">
            {name}
          </span>
          <span className="text-xs text-gray-500">{role}</span>
        </div>
        <div className="flex flex-col items-center">
          <img
            src="/avatar.png"
            className="w-14 h-14 rounded-full object-cover"
          />

          <button
            onClick={() => navigate("/profile")}
            className="text-emerald-700 border border-emerald-700 text-xs rounded-lg w-[88px] h-6 mt-1
                             flex items-center justify-center hover:bg-emerald-700 hover:text-white transition"
          >
            แก้ไขโปรไฟล์
          </button>
        </div>
      </div>
    </div>
  );
}
