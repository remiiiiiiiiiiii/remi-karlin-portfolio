/**
 * "/videos/solene-preview.mp4" -> "/videos/posters/solene-preview.webp" (or "-tiny.webp", the ~24px blur-up).
 * A still image (.webp/.jpg/.jpeg/.png/.avif) is its own poster: it is returned unchanged for both
 * variants, since there is no blur-up file for it.
 * Pure string helper with no data import, so server and client components can both use it.
 */
export function posterPath(src: string, tiny = false): string {
  if (/\.(webp|jpe?g|png|avif)$/i.test(src)) return src;
  const m = src.match(/^(.*)\/([^/]+?)\.[a-z0-9]+$/i);
  if (!m) return src;
  return `${m[1]}/posters/${m[2]}${tiny ? "-tiny" : ""}.webp`;
}
