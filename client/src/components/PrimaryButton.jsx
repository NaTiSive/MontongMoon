export default function PrimaryButton({ title = "primaryButton", onClick }) {
  return (
    <button
      onClick={onClick}
      className="text-xl bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800 transition"
    >
      {title}
    </button>
  );
}
