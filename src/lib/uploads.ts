import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { del, get, put } from "@vercel/blob";

// Vercel rejects request bodies over 4.5 MB before they reach the app. The browser shrinks photos
// before sending (src/lib/shrink-image.ts), so this only bites on large PDFs.
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

type Kind = { ext: string; mime: string; matches: (b: Buffer) => boolean };

// The type is decided by the file's first bytes, never by the name or the browser's claim, so a
// renamed HTML file cannot be served back as something a browser would execute.
const KINDS: Kind[] = [
  { ext: "jpg", mime: "image/jpeg", matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { ext: "png", mime: "image/png", matches: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
  { ext: "webp", mime: "image/webp", matches: (b) => b.toString("latin1", 0, 4) === "RIFF" && b.toString("latin1", 8, 12) === "WEBP" },
  { ext: "heic", mime: "image/heic", matches: (b) => b.toString("latin1", 4, 8) === "ftyp" && /^(heic|heix|mif1|msf1|hevc)$/.test(b.toString("latin1", 8, 12)) },
  { ext: "pdf", mime: "application/pdf", matches: (b) => b.toString("latin1", 0, 5) === "%PDF-" },
];

const NAME_RE = new RegExp(`^[0-9a-f-]{36}\\.(${KINDS.map((k) => k.ext).join("|")})$`);

export class ReceiptError extends Error {}

// ---- storage backends ---------------------------------------------------------------------------
// Receipts live in a private Vercel Blob store when one is connected (production), and on local
// disk otherwise (development). Either way they are only ever served through the auth-gated
// /comprovantes/[file] route.

type Stored = { body: ReadableStream<Uint8Array> | Uint8Array<ArrayBuffer>; mime: string };

function blobEnabled(): boolean {
  // On Vercel a connected store authenticates by OIDC and sets BLOB_STORE_ID; elsewhere a token.
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

const blobPath = (name: string) => `receipts/${name}`;

function uploadsDir(): string {
  // Resolved at runtime, so the build must not trace it.
  return path.resolve(/*turbopackIgnore: true*/ process.env.UPLOADS_DIR ?? "./uploads");
}

function diskPath(name: string): string {
  return path.join(/*turbopackIgnore: true*/ uploadsDir(), name);
}

async function store(name: string, bytes: Buffer, mime: string): Promise<void> {
  if (blobEnabled()) {
    await put(blobPath(name), bytes, { access: "private", contentType: mime, addRandomSuffix: false });
    return;
  }
  // Vercel's filesystem is read-only: fail with a message that names the fix instead of EROFS.
  if (process.env.VERCEL) throw new ReceiptError("Armazenamento de comprovantes não configurado (conecte um Blob store privado).");
  await mkdir(uploadsDir(), { recursive: true });
  await writeFile(diskPath(name), bytes);
}

// ---- public API ---------------------------------------------------------------------------------

/** Stores an uploaded receipt and returns its file name. Throws ReceiptError with a message fit for the member. */
export async function saveReceipt(file: File): Promise<string> {
  if (file.size === 0) throw new ReceiptError("Anexe o comprovante.");
  if (file.size > MAX_RECEIPT_BYTES) throw new ReceiptError("O comprovante passa de 4 MB.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const kind = KINDS.find((k) => k.matches(bytes));
  if (!kind) throw new ReceiptError("Envie uma foto (JPG, PNG, WEBP, HEIC) ou um PDF.");
  const name = `${randomUUID()}.${kind.ext}`;
  await store(name, bytes, kind.mime);
  return name;
}

/** Reads a stored receipt by name. Returns null for names this module could not have produced. */
export async function readReceipt(name: string): Promise<Stored | null> {
  if (!NAME_RE.test(name)) return null;
  const ext = name.slice(name.lastIndexOf(".") + 1);
  // The MIME type comes from our own extension, decided by magic bytes at upload.
  const mime = KINDS.find((k) => k.ext === ext)!.mime;
  try {
    if (blobEnabled()) {
      const result = await get(blobPath(name), { access: "private" });
      return result?.statusCode === 200 ? { body: result.stream, mime } : null;
    }
    return { body: new Uint8Array(await readFile(diskPath(name))), mime };
  } catch {
    return null;
  }
}

export async function removeReceipt(name: string): Promise<void> {
  if (!NAME_RE.test(name)) return;
  if (blobEnabled()) await del(blobPath(name));
  else await rm(diskPath(name), { force: true });
}

export function isImageReceipt(name: string): boolean {
  return !name.endsWith(".pdf") && !name.endsWith(".heic");
}
