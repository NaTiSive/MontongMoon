import { useState } from "react";
import { FaMagnifyingGlass } from "react-icons/fa6";

export default function SearchBar({ placeholder = "ค้นหา...", onSearch }) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (onSearch) onSearch(query);
  };

  return (
    <div className="flex items-center gap-2 w-full max-w-md border border-gray-300 rounded-lg px-3 py-2 
                    focus-within:ring-2 focus-within:ring-green-500 bg-white">
  
      <FaMagnifyingGlass className="text-gray-500 w-5 h-5" onClick={handleSearch} />

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
        placeholder={placeholder}
        className="w-full outline-none text-gray-800 placeholder-gray-400"
      />
    </div>
  );
}