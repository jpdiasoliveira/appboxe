export function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const escape = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n')) {
      return `"${cell.replace(/"/g, '""')}"`
    }
    return cell
  }

  const lines: string[] = []
  if (headers.length > 0) {
    lines.push(headers.map(escape).join(','))
  }
  for (const row of rows) {
    lines.push(row.map((c) => escape(c)).join(','))
  }

  const blob = new Blob(['\uFEFF' + lines.join('\n')], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
