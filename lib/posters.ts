/**
 * "/videos/solene-preview.mp4" -> "/videos/posters/solene-preview.webp" (or "-tiny.webp", the ~24px blur-up).
 * Pure string helper with no data import, so server and client components can both use it.
 */
export function posterPath(src: string, tiny = false): string {
  const m = src.match(/^(.*)\/([^/]+?)\.[a-z0-9]+$/i);
  if (!m) return src;
  return `${m[1]}/posters/${m[2]}${tiny ? "-tiny" : ""}.webp`;
}
