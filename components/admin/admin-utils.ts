export function formatDate(iso: string) {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  })
}

export function formatTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}m${sec.toString().padStart(2, "0")}s`
}
