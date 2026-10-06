"use server";

import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { endSession, hashPassword, requireMember, startSession, verifyPassword } from "@/lib/auth";
import { db } from "@/lib/db";
import { parseBRL } from "@/lib/money";
import { ReceiptError, removeReceipt, saveReceipt } from "@/lib/uploads";

export type FormState = { error?: string; saved?: boolean } | undefined;

const MAX_AMOUNT_CENTS = 10_000_000; // R$ 100.000 — anything above is a typo.

function text(fd: FormData, key: string): string {
  const v = fd.get(key);
  return typeof v === "string" ? v.trim() : "";
}

function file(fd: FormData, key: string): File | null {
  const v = fd.get(key);
  return v instanceof File && v.size > 0 ? v : null;
}

function normalizeName(name: string): string {
  return name.replace(/\s+/g, " ").trim();
}

// The member table is a lab's worth of rows, so matching names case-insensitively in memory is
// simpler than a case-folded column (SQLite's UNIQUE is case-sensitive).
async function findMemberByName(name: string) {
  const wanted = name.toLocaleLowerCase("pt-BR");
  const members = await db.member.findMany();
  return members.find((m) => m.name.toLocaleLowerCase("pt-BR") === wanted) ?? null;
}

/** Empty means "no key". Returns an error message instead when the value is clearly wrong. */
function parsePixKey(raw: string): { pixKey: string | null } | { error: string } {
  const pixKey = raw.replace(/\s+/g, " ").trim();
  if (!pixKey) return { pixKey: null };
  // 77 is the longest a Pix key can be (an e-mail); random keys are 36.
  if (pixKey.length > 77) return { error: "Chave Pix longa demais." };
  return { pixKey };
}

function sameSecret(a: string, b: string): boolean {
  const h = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(h(a), h(b));
}

// ---- auth -------------------------------------------------------------------------------------

export async function signUp(_: FormState, fd: FormData): Promise<FormState> {
  const code = text(fd, "code");
  const name = normalizeName(text(fd, "name"));
  const password = text(fd, "password");
  const pix = parsePixKey(text(fd, "pixKey"));

  const labCode = process.env.LAB_ACCESS_CODE;
  if (!labCode) return { error: "O servidor está sem LAB_ACCESS_CODE configurado." };
  if (!sameSecret(code, labCode)) return { error: "Código do laboratório incorreto." };
  if (name.length < 2 || name.length > 40) return { error: "Use um nome entre 2 e 40 caracteres." };
  if (password.length < 6) return { error: "A senha precisa de pelo menos 6 caracteres." };
  if ("error" in pix) return pix;
  if (await findMemberByName(name)) return { error: "Já existe um membro com esse nome." };

  const member = await db.member.create({
    data: { name, passwordHash: await hashPassword(password), pixKey: pix.pixKey },
  });
  await startSession(member.id);
  redirect("/");
}

export async function signIn(_: FormState, fd: FormData): Promise<FormState> {
  const member = await findMemberByName(normalizeName(text(fd, "name")));
  const ok = member && (await verifyPassword(text(fd, "password"), member.passwordHash));
  if (!member || !ok) return { error: "Nome ou senha incorretos." };
  await startSession(member.id);
  redirect("/");
}

export async function signOut(): Promise<void> {
  await endSession();
  redirect("/entrar");
}

// ---- purchases --------------------------------------------------------------------------------

function parseDay(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  // Noon UTC: the calendar day survives any timezone it is displayed in.
  const d = new Date(`${value}T12:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createPurchase(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMember();
  const description = text(fd, "description");
  const amountCents = parseBRL(text(fd, "amount"));
  const purchasedAt = parseDay(text(fd, "purchasedAt"));
  const receipt = file(fd, "receipt");

  if (description.length < 2 || description.length > 200)
    return { error: "Descreva a compra (até 200 caracteres)." };
  if (!amountCents || amountCents > MAX_AMOUNT_CENTS) return { error: "Valor inválido." };
  if (!purchasedAt) return { error: "Data inválida." };
  if (purchasedAt.getTime() > Date.now() + 24 * 60 * 60 * 1000)
    return { error: "A data da compra está no futuro." };
  if (!receipt) return { error: "Anexe o comprovante da compra." };

  let receiptFile: string;
  try {
    receiptFile = await saveReceipt(receipt);
  } catch (e) {
    if (e instanceof ReceiptError) return { error: e.message };
    throw e;
  }

  // The buyer counts in the split even if they had marked themselves inactive.
  const others = await db.member.count({ where: { active: true, id: { not: me.id } } });
  const purchase = await db.purchase.create({
    data: {
      buyerId: me.id,
      description,
      amountCents,
      purchasedAt,
      receiptFile,
      splitCount: others + 1,
    },
  });
  revalidatePath("/", "layout");
  redirect(`/compras/${purchase.id}`);
}

export async function deletePurchase(fd: FormData): Promise<void> {
  const me = await requireMember();
  const purchase = await db.purchase.findUnique({
    where: { id: text(fd, "purchaseId") },
    include: { _count: { select: { contributions: true } } },
  });
  // Only the buyer, and only before anyone paid: afterwards the record is what others relied on.
  if (!purchase || purchase.buyerId !== me.id || purchase._count.contributions > 0) return;
  await db.purchase.delete({ where: { id: purchase.id } });
  await removeReceipt(purchase.receiptFile);
  revalidatePath("/", "layout");
  redirect("/");
}

// ---- contributions ----------------------------------------------------------------------------

export async function createContribution(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMember();
  const purchase = await db.purchase.findUnique({ where: { id: text(fd, "purchaseId") } });
  if (!purchase) return { error: "Compra não encontrada." };
  if (purchase.buyerId === me.id) return { error: "Você é quem comprou — não precisa contribuir." };

  const amountCents = parseBRL(text(fd, "amount"));
  if (!amountCents || amountCents > MAX_AMOUNT_CENTS) return { error: "Valor inválido." };
  const note = text(fd, "note").slice(0, 200) || null;

  let receiptFile: string | null = null;
  const receipt = file(fd, "receipt");
  if (receipt) {
    try {
      receiptFile = await saveReceipt(receipt);
    } catch (e) {
      if (e instanceof ReceiptError) return { error: e.message };
      throw e;
    }
  }

  await db.contribution.create({
    data: { purchaseId: purchase.id, memberId: me.id, amountCents, receiptFile, note },
  });
  revalidatePath("/", "layout");
  return {};
}

export async function deleteContribution(fd: FormData): Promise<void> {
  const me = await requireMember();
  const contribution = await db.contribution.findUnique({ where: { id: text(fd, "contributionId") } });
  if (!contribution || contribution.memberId !== me.id) return;
  await db.contribution.delete({ where: { id: contribution.id } });
  if (contribution.receiptFile) await removeReceipt(contribution.receiptFile);
  revalidatePath("/", "layout");
}

// ---- members ----------------------------------------------------------------------------------

export async function updatePixKey(_: FormState, fd: FormData): Promise<FormState> {
  const me = await requireMember();
  const pix = parsePixKey(text(fd, "pixKey"));
  if ("error" in pix) return pix;
  await db.member.update({ where: { id: me.id }, data: { pixKey: pix.pixKey } });
  revalidatePath("/", "layout");
  return { saved: true };
}

export async function setMemberActive(fd: FormData): Promise<void> {
  await requireMember();
  await db.member.update({
    where: { id: text(fd, "memberId") },
    data: { active: text(fd, "active") === "true" },
  });
  revalidatePath("/membros");
}
