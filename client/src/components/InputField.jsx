// src/components/InputField.jsx
export default function InputField({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  disabled = false,
}) {
  return (
    <div className="mb-4">
      {label && (
        <p className="text-sm font-medium text-gray-700 mb-1">
          {label}
        </p>
      )}

      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 
                   focus:outline-none focus:ring-2 focus:ring-green-500
                   text-gray-800 placeholder-gray-400
                   disabled:bg-gray-100 disabled:text-gray-500 disabled:cursor-not-allowed"
      />
    </div>
  );
}
