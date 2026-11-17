import os from "node:os";
import path from "node:path";
import fs from "node:fs/promises";
import { afterEach, describe, expect, it } from "vitest";
import { getDocumentStorage, LocalDocumentStorage, MAX_DOCUMENT_BYTES, validateDocument } from "@/lib/onboarding/documents";

const bytes = (...head: number[]) => Uint8Array.from([...head, 1, 2, 3, 4]);
const PDF = bytes(0x25, 0x50, 0x44, 0x46, 0x2d);
const JPEG = bytes(0xff, 0xd8, 0xff, 0xe0);
const PNG = bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);

describe("validateDocument", () => {
  it("accepts a PDF, JPEG and PNG by magic bytes", () => {
    expect(validateDocument({ bytes: PDF, filename: "cert.pdf", contentType: "application/pdf" })).toMatchObject({ ok: true, contentType: "application/pdf", ext: "pdf" });
    expect(validateDocument({ bytes: JPEG, filename: "scan.JPG", contentType: "image/jpeg" })).toMatchObject({ ok: true, contentType: "image/jpeg", ext: "jpg" });
    expect(validateDocument({ bytes: PNG, filename: "scan.png", contentType: "image/png" })).toMatchObject({ ok: true, contentType: "image/png", ext: "png" });
  });

  it("accepts a missing or generic MIME type when the bytes are right", () => {
    expect(validateDocument({ bytes: PDF, filename: "cert", contentType: "" }).ok).toBe(true);
    expect(validateDocument({ bytes: PDF, filename: "cert.pdf", contentType: "application/octet-stream" }).ok).toBe(true);
  });

  it("rejects a disguised file: right extension and MIME type, wrong bytes", () => {
    const exe = Uint8Array.from([0x4d, 0x5a, 0x90, 0x00, 1, 2, 3]);
    expect(validateDocument({ bytes: exe, filename: "cert.pdf", contentType: "application/pdf" })).toMatchObject({ ok: false, error: "unsupported_type" });
    const html = new TextEncoder().encode("<html><script>alert(1)</script></html>");
    expect(validateDocument({ bytes: html, filename: "scan.png", contentType: "image/png" })).toMatchObject({ ok: false, error: "unsupported_type" });
  });

  it("rejects bytes that contradict the declared type or extension", () => {
    expect(validateDocument({ bytes: PNG, filename: "cert.pdf", contentType: "application/pdf" })).toMatchObject({ ok: false, error: "type_mismatch" });
    expect(validateDocument({ bytes: PDF, filename: "cert.pdf", contentType: "image/png" })).toMatchObject({ ok: false, error: "type_mismatch" });
    expect(validateDocument({ bytes: PDF, filename: "cert.exe", contentType: "application/pdf" })).toMatchObject({ ok: false, error: "type_mismatch" });
  });

  it("enforces the 5 MB limit and rejects empty files", () => {
    const atLimit = new Uint8Array(MAX_DOCUMENT_BYTES);
    atLimit.set(PDF);
    expect(validateDocument({ bytes: atLimit, filename: "a.pdf", contentType: "application/pdf" }).ok).toBe(true);
    const over = new Uint8Array(MAX_DOCUMENT_BYTES + 1);
    over.set(PDF);
    expect(validateDocument({ bytes: over, filename: "a.pdf", contentType: "application/pdf" })).toMatchObject({ ok: false, error: "too_large" });
    expect(validateDocument({ bytes: new Uint8Array(0), filename: "a.pdf", contentType: "application/pdf" })).toMatchObject({ ok: false, error: "empty" });
  });
});

describe("LocalDocumentStorage", () => {
  let dir: string | undefined;
  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true });
    dir = undefined;
  });

  it("round-trips a file under a random name, never the user's file name", async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "uploads-"));
    const storage = new LocalDocumentStorage(dir);
    const put = await storage.put({ bytes: PDF, filename: "../../Asha Rao enrolment.pdf", contentType: "application/pdf" });
    expect(put).toMatchObject({ size: PDF.length, contentType: "application/pdf" });
    expect(put.ref).toMatch(/^[0-9a-f]{32}\.pdf$/);
    expect(put.ref).not.toContain("Asha");

    expect(await fs.readdir(dir)).toEqual([put.ref]);
    const got = await storage.get(put.ref);
    expect(got?.contentType).toBe("application/pdf");
    expect(Array.from(got!.bytes)).toEqual(Array.from(PDF));

    const second = await storage.put({ bytes: PDF, filename: "same.pdf", contentType: "application/pdf" });
    expect(second.ref).not.toBe(put.ref);

    await storage.remove(put.ref);
    expect(await storage.get(put.ref)).toBeNull();
    await storage.remove(put.ref); // removing twice is fine
    expect(await storage.get(second.ref)).not.toBeNull();
  });

  it("refuses invalid files and path-like references", async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), "uploads-"));
    const storage = new LocalDocumentStorage(dir);
    await expect(storage.put({ bytes: Uint8Array.from([1, 2, 3]), filename: "x.pdf", contentType: "application/pdf" })).rejects.toThrow(/rejected/);
    expect(await fs.readdir(dir).catch(() => [])).toEqual([]);
    expect(await storage.get("../secret.pdf")).toBeNull();
    expect(await storage.get("/etc/passwd")).toBeNull();
    await expect(storage.remove("../x")).resolves.toBeUndefined();
  });
});

describe("getDocumentStorage", () => {
  const original = process.env.VERCEL;
  afterEach(() => {
    if (original === undefined) delete process.env.VERCEL;
    else process.env.VERCEL = original;
  });

  it("is local off Vercel and null on Vercel", () => {
    delete process.env.VERCEL;
    expect(getDocumentStorage()).toBeInstanceOf(LocalDocumentStorage);
    process.env.VERCEL = "1";
    expect(getDocumentStorage()).toBeNull();
  });
});
