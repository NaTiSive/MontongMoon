export default function SecondaryButton({ title = "SecondaryButton", onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xl border-2 border-yellow-400 text-yellow-500 bg-white 
                 px-6 py-2 rounded-lg font-semibold
                 hover:bg-yellow-50 active:bg-yellow-100
                 transition-all duration-200"
    >
      {title}
    </button>
  );
}
