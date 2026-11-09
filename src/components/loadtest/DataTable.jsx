export default function DataTable({ columns, rows, caption }) {
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border/70">
        <table className="w-full min-w-[32rem] text-left text-sm">
          <thead className="bg-secondary/50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className="whitespace-nowrap px-3 py-2 text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {rows.map((row, index) => (
              <tr key={index} className="align-top">
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={
                      column.mono
                        ? 'whitespace-nowrap px-3 py-2.5 font-mono text-[12px] tabular-nums'
                        : 'px-3 py-2.5 leading-relaxed'
                    }
                  >
                    {row[column.key]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption && <p className="mt-2 px-1 text-[11px] leading-relaxed text-muted-foreground">{caption}</p>}
    </div>
  );
}