export default function PrimaryButton({ title = "primaryButton", onClick,   type = "button",
  disabled = false,
  className = "", }) {
  return (
    <button
      onClick={onClick}
      className={`text-xl bg-green-700 text-white px-4 py-2 rounded-lg 
                  hover:bg-green-800 transition ${className}`}
    >
      {title}
    </button>
  );
}
