import fs from "node:fs";
import path from "node:path";
import { UserError } from "./args.mjs";

/** Serializer that reproduces the formatting already used in data/projects.json
 *  (2-space indent, arrays of primitives inline) so diffs stay minimal. */
export function serialize(v, ind = "") {
  if (Array.isArray(v)) {
    if (v.length === 0) return "[]";
    if (v.every((x) => x === null || typeof x !== "object")) return "[" + v.map((x) => JSON.stringify(x)).join(", ") + "]";
    return "[\n" + v.map((x) => ind + "  " + serialize(x, ind + "  ")).join(",\n") + "\n" + ind + "]";
  }
  if (v && typeof v === "object") {
    const keys = Object.keys(v).filter((k) => v[k] !== undefined);
    if (!keys.length) return "{}";
    return "{\n" + keys.map((k) => ind + "  " + JSON.stringify(k) + ": " + serialize(v[k], ind + "  ")).join(",\n") + "\n" + ind + "}";
  }
  return JSON.stringify(v);
}

export function dataPath(root) {
  return path.join(root, "data", "projects.json");
}

export function load(root) {
  const file = dataPath(root);
  if (!fs.existsSync(file)) throw new UserError(`Cannot find ${file}. Run from the portfolio repo or pass --root.`);
  const data = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!data || !Array.isArray(data.projects)) throw new UserError("data/projects.json has no \"projects\" array.");
  return data;
}

/** Write via temp file, re-parse to prove it is valid, then rename into place. */
export function save(root, data) {
  const file = dataPath(root);
  const text = serialize(data) + "\n";
  const parsed = JSON.parse(text); // throws if we produced garbage
  if (parsed.projects.length !== data.projects.length) throw new Error("Serialization changed the project count; aborting.");
  const tmp = file + ".tmp";
  fs.writeFileSync(tmp, text);
  JSON.parse(fs.readFileSync(tmp, "utf8"));
  fs.renameSync(tmp, file);
}
