export default function InputField({
  label,
  type = "text",
  placeholder = "",
  value,
  onChange,
  ...rest // 👈 รับพร็อพอื่น ๆ เช่น name, disabled, autoComplete ฯลฯ
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
        className="w-full border border-gray-300 rounded-lg px-3 py-2 
                   focus:outline-none focus:ring-2 focus:ring-green-500
                   text-gray-800 placeholder-gray-400"
        {...rest} // 👈 กระจายลง input
      />
    </div>
  );
}
