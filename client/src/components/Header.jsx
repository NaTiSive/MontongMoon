import "./Header.css";

export default function Header({ name = "ชื่อผู้ใช้", role = "บทบาท" }) {
  return (
    <div className="fixed top-0 left-0 w-full bg-white shadow-sm py-3 px-6 flex justify-end items-center z-50">
      <div className="flex justify-between items-center py-4 px-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-start">
            <span className="text-sm font-medium text-gray-800">{name}</span>
            <span className="text-xs text-gray-500">{role}</span>
          </div>
          <div className="flex flex-col items-center">
            <img
              src="/avatar.png"
              className="w-15 h-15 rounded-full object-cover"
            />
            <button className="text-green-700 border border-green-700 text-xs rounded-lg w-[80px] h-5 mt-1 flex items-center justify-center hover:bg-green-700 hover:text-white transition">
              แก้ไขโปรไฟล์
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
