export default function SelectField({
  label,
  options = [],
  placeholder = "",
  value,
  onChange,
}) {
  return (
    <div className="mb-4">
      {label && (<p className="text-sm font-medium text-gray-700 mb-1">
        {label}
        </p>
        )}

      <select
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 
                   focus:outline-none focus:ring-2 focus:ring-green-500
                   text-gray-800 bg-white"
      >
        {/* placeholder ด้านบนสุด */}
        {placeholder && (
          <option value="" disabled selected hidden>
            {placeholder}
          </option>
        )}

        {/* แสดงรายการที่ส่งมาจาก props */}
        {options.map((opt, index) => (
          <option key={index} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}
