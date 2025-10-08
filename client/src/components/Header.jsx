import "./Header.css"

export default function Header({ title }) {
  return (
    <div className="flex justify-between items-center py-4 px-6 bg-white shadow-sm rounded-lg">
      <h1 className="text-xl font-semibold text-gray-800">{title}</h1>
      <div className="flex items-center gap-3">
        <div className="flex flex-col items-start gap-2">
          <span className="text-sm text-gray-600">Nattakorn KK</span>
          <span className="text-sm text-gray-600">role</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <img src="/avatar.png" className="w-8 h-8 rounded-full" />
          <span className="text-green-700 border border-green-700 text-xs bg-white- rounded w-[80px] h-5 flex items-center justify-center">แก้ไขโปรไฟล์</span>
        </div>
      </div>
    </div>
  );
}
