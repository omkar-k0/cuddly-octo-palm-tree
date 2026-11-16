/**
 * Make a password hash for ADMIN_USERS. Reads the password from stdin so it
 * does not end up in shell history:
 *
 *   npm run -s admin:hash            # type the password, press Enter
 *   printf '%s' "$PW" | npm run -s admin:hash
 */
import { hashPassword } from "../../src/lib/admin/auth";

let input = "";
process.stdin.setEncoding("utf8");
if (process.stdin.isTTY) process.stderr.write("Password (at least 12 characters): ");
process.stdin.on("data", (chunk) => {
  input += chunk;
  if (process.stdin.isTTY && input.includes("\n")) process.stdin.emit("end");
});
process.stdin.on("end", () => {
  const pw = input.replace(/\r?\n$/, "");
  if (pw.length < 12) {
    process.stderr.write("Use at least 12 characters.\n");
    process.exit(1);
  }
  process.stdout.write(`${hashPassword(pw)}\n`);
  process.exit(0);
});
