// src/components/PrimaryButton.jsx
export default function PrimaryButton({
  title = "primaryButton",
  onClick,
  type = "button",
  disabled = false,
  className = "",
}) {
  return (
    <button
      onClick={onClick}
      type={type}
      disabled={disabled}
      className={`text-xl px-4 py-2 rounded-lg transition
                  ${disabled ? "bg-green-400 cursor-not-allowed opacity-70"
                             : "bg-green-700 hover:bg-green-800"}
                  text-white ${className}`}
    >
      {title}
    </button>
  );
}
