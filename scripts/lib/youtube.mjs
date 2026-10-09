import { UserError } from "./args.mjs";

const ID = /^[A-Za-z0-9_-]{11}$/;

/** Extract the 11-character video id from any YouTube URL form (or a bare id). Drops ?si= and friends. */
export function parseYoutubeId(input) {
  const raw = String(input || "").trim();
  if (ID.test(raw)) return raw;
  let url;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    throw new UserError(`Not a YouTube link: "${input}"`);
  }
  const host = url.hostname.replace(/^www\.|^m\.|^music\./, "");
  let id = "";
  if (host === "youtu.be") {
    id = url.pathname.split("/")[1] || "";
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (url.pathname === "/watch") id = url.searchParams.get("v") || "";
    else {
      const m = url.pathname.match(/^\/(?:embed|shorts|live|v)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  }
  if (!ID.test(id)) throw new UserError(`Could not find a YouTube video id in "${input}"`);
  return id;
}

/**
 * Accepts "URL|title", a bare URL/id, or an object {url|youtubeId|id, title}.
 * Returns { youtubeId, title } (title may be "" if not given).
 */
export function parseYoutubeSpec(spec) {
  if (spec && typeof spec === "object") {
    const link = spec.url || spec.youtubeId || spec.id;
    return { youtubeId: parseYoutubeId(link), title: spec.title ? String(spec.title).trim() : "" };
  }
  const s = String(spec);
  const bar = s.indexOf("|");
  if (bar === -1) return { youtubeId: parseYoutubeId(s), title: "" };
  return { youtubeId: parseYoutubeId(s.slice(0, bar)), title: s.slice(bar + 1).trim() };
}
