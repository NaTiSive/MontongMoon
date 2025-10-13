export default function TextArea({
  label = "",
  type = "text",
  placeholder = "",
  value = "",
  onChange,
  rows = 3,
}) {
  return (
    <div className="mb-4">
      {label && (
        <p className="text-sm font-medium text-gray-700 mb-1">{label}</p>
      )}

      <textarea
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={rows}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 
                   focus:outline-none focus:ring-2 focus:ring-green-500
                   text-gray-800 placeholder-gray-400 resize-none"
      ></textarea>
    </div>
  );
}
