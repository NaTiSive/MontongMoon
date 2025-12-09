export default function DataTable({
  columns = [], // [{ key:'status', header:'สถานะ', render?:(row)=>JSX }]
  data = [],
  emptyText = "ยังไม่มีข้อมูล",
  renderRowActions, // (row) => JSX (ปุ่มอนุมัติ/ปฏิเสธ ฯลฯ)
  className = "",
}) {
  return (
    <div className={`w-full overflow-x-auto rounded-xl border border-gray-200 bg-white ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-green-100">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600"
              >
                {col.header}
              </th>
            ))}
            {renderRowActions && (
              <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-600">
                การกระทำ
              </th>
            )}
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {data.length === 0 && (
            <tr>
              <td
                colSpan={columns.length + (renderRowActions ? 1 : 0)}
                className="px-4 py-6 text-center text-sm text-gray-500"
              >
                {emptyText}
              </td>
            </tr>
          )}

          {data.map((row, idx) => (
            <tr key={row.id ?? idx} className="hover:bg-gray-50">
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-sm text-gray-800 whitespace-nowrap">
                  {col.render ? col.render(row) : row[col.key]}
                </td>
              ))}

              {renderRowActions && (
                <td className="px-4 py-3 text-right">
                  {renderRowActions(row)}
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
