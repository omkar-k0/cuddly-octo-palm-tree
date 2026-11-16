/** Print a random value for ADMIN_SESSION_SECRET. */
import crypto from "node:crypto";

process.stdout.write(`${crypto.randomBytes(32).toString("base64url")}\n`);
