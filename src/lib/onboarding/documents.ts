/**
 * Document storage framework for applicants' enrolment certificates.
 * Framework only: uploads are not wired into the form yet.
 *
 * - validateDocument checks the bytes (magic numbers), not just the file
 *   name or the browser's MIME type. Only PDF, JPEG and PNG, up to 5 MB.
 * - Stored files get random names. The applicant's file name is never used
 *   on disk, and `ref` is an opaque handle.
 * - Local development writes to .data/uploads/ (git-ignored). On Vercel the
 *   local disk is not durable, so there is no storage until a private
 *   adapter exists.
 */
import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024;

export interface DocumentFile {
  bytes: Uint8Array;
  /** The applicant's file name. Only its extension is checked; it is never stored or used as a path. */
  filename: string;
  /** Declared MIME type; must agree with the bytes. */
  contentType: string;
}

export interface StoredDocumentInfo {
  ref: string;
  size: number;
  contentType: string;
}

export interface DocumentStorage {
  put(file: DocumentFile): Promise<StoredDocumentInfo>;
  get(ref: string): Promise<{ bytes: Uint8Array; contentType: string } | null>;
  remove(ref: string): Promise<void>;
}

type Kind = { contentType: "application/pdf" | "image/jpeg" | "image/png"; ext: "pdf" | "jpg" | "png"; extensions: string[] };

const PDF: Kind = { contentType: "application/pdf", ext: "pdf", extensions: ["pdf"] };
const JPEG: Kind = { contentType: "image/jpeg", ext: "jpg", extensions: ["jpg", "jpeg"] };
const PNG: Kind = { contentType: "image/png", ext: "png", extensions: ["png"] };

const startsWith = (bytes: Uint8Array, magic: number[]) => bytes.length >= magic.length && magic.every((b, i) => bytes[i] === b);

function sniff(bytes: Uint8Array): Kind | null {
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46, 0x2d])) return PDF; // %PDF-
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) return JPEG;
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return PNG;
  return null;
}

export type DocumentCheck =
  | { ok: true; contentType: Kind["contentType"]; ext: Kind["ext"] }
  | { ok: false; error: "empty" | "too_large" | "unsupported_type" | "type_mismatch"; message: string };

/**
 * Accept only PDF, JPEG or PNG, decided by the file's first bytes. A declared
 * MIME type or extension that contradicts the bytes is rejected.
 */
export function validateDocument(file: DocumentFile): DocumentCheck {
  const size = file.bytes.length;
  if (size === 0) return { ok: false, error: "empty", message: "The file is empty." };
  if (size > MAX_DOCUMENT_BYTES) return { ok: false, error: "too_large", message: "The file is larger than 5 MB." };

  const kind = sniff(file.bytes);
  if (!kind) return { ok: false, error: "unsupported_type", message: "Only PDF, JPEG or PNG files are accepted." };

  const declared = file.contentType.trim().toLowerCase().split(";")[0];
  const declaredOk = !declared || declared === "application/octet-stream" || declared === kind.contentType || (kind === JPEG && declared === "image/jpg");
  const extension = path.extname(file.filename).slice(1).toLowerCase();
  const extensionOk = !extension || kind.extensions.includes(extension);
  if (!declaredOk || !extensionOk) {
    return { ok: false, error: "type_mismatch", message: "The file type does not match its contents." };
  }
  return { ok: true, contentType: kind.contentType, ext: kind.ext };
}

const REF = /^[0-9a-f]{32}\.(pdf|jpg|png)$/;
const CONTENT_TYPES: Record<string, string> = { pdf: PDF.contentType, jpg: JPEG.contentType, png: PNG.contentType };

/** Files on local disk under .data/uploads/. For development; not durable on serverless hosts. */
export class LocalDocumentStorage implements DocumentStorage {
  constructor(private dir = path.join(process.cwd(), ".data", "uploads")) {}

  async put(file: DocumentFile): Promise<StoredDocumentInfo> {
    const check = validateDocument(file);
    if (!check.ok) throw new Error(`document rejected: ${check.error}`);
    const ref = `${crypto.randomBytes(16).toString("hex")}.${check.ext}`;
    await fs.mkdir(this.dir, { recursive: true, mode: 0o700 });
    await fs.writeFile(path.join(this.dir, ref), file.bytes, { flag: "wx", mode: 0o600 });
    return { ref, size: file.bytes.length, contentType: check.contentType };
  }

  async get(ref: string) {
    if (!REF.test(ref)) return null;
    try {
      const buf = await fs.readFile(path.join(this.dir, ref));
      return { bytes: new Uint8Array(buf), contentType: CONTENT_TYPES[ref.split(".")[1]] };
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async remove(ref: string): Promise<void> {
    if (!REF.test(ref)) return;
    await fs.rm(path.join(this.dir, ref), { force: true });
  }
}

/**
 * Local disk when not on Vercel; null on Vercel (no durable, private
 * storage yet, so uploads stay switched off there).
 *
 * TODO: add a private Vercel Blob adapter (access: "private", served only
 * through an authenticated team route) and return it here on Vercel.
 */
export function getDocumentStorage(): DocumentStorage | null {
  if (process.env.VERCEL) return null;
  return new LocalDocumentStorage();
}
