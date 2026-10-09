// Tiny argument parser: --key value, --key=value, boolean flags, repeatable keys.
export class UserError extends Error {}

const BOOLEAN = new Set(["dry-run", "force", "delete-media", "help", "hidden"]);
export const REPEATABLE = new Set(["youtube", "preview", "image", "credit", "full", "pending"]);

export function parseArgs(argv) {
  const flags = {};
  const positionals = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      positionals.push(a);
      continue;
    }
    let key = a.slice(2);
    let value;
    const eq = key.indexOf("=");
    if (eq !== -1) {
      value = key.slice(eq + 1);
      key = key.slice(0, eq);
    } else if (BOOLEAN.has(key)) {
      value = true;
    } else {
      const next = argv[i + 1];
      if (next === undefined || (next.startsWith("--") && next.length > 2)) {
        throw new UserError(`Flag --${key} needs a value.`);
      }
      value = next;
      i++;
    }
    if (REPEATABLE.has(key)) (flags[key] ||= []).push(value);
    else flags[key] = value;
  }
  return { flags, positionals };
}
