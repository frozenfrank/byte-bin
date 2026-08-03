/** Helper function that assumes the value is element is always in the DOM. */
export function getElementById<T = HTMLElement>(id: string): T {
  return document.getElementById(id) as T;
}

/** Formats a duration in seconds as a human-readable "Hh Mm" string. */
export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.round((totalSeconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}
