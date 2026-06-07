/** 312 -> "5h12" ; 45 -> "45min". */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}min`;
  return `${h}h${String(m).padStart(2, '0')}`;
}

/** ISO date -> "jeu. 5 juin" (fr). */
export function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long' });
}

/** ISO timestamp -> "à l'instant" / "il y a 5 min" / "il y a 2 h" / "il y a 3 j". */
export function timeAgo(iso: string, now = new Date()): string {
  const diffMs = now.getTime() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "à l'instant";
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return `il y a ${d} j`;
}

/** Relative day label from an ISO date, fallback to formatted date. */
export function relativeDay(iso: string, today = new Date()): string {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(d) - startOf(today)) / 86_400_000);
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === -1) return 'Hier';
  if (diffDays === 1) return 'Demain';
  return formatDate(iso);
}
