import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, lt, sql } from "drizzle-orm";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { cache } from "react";
import { db } from "@/db";
import { adminSessions, admins } from "@/db/auth-schema";
import { hashPassword, verifyPassword } from "@/lib/password";

const SESSION_COOKIE = "busnow_session";
const SESSION_DAYS = 7;
const MAX_FAILED_ATTEMPTS = 5;
const LOCK_MINUTES = 15;

export type AdminUser = { id: number; email: string; name: string };

// O cookie guarda o código; o banco guarda só a impressão dele
const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

// Para o tempo de resposta não revelar se o e-mail existe, quando ele não
// existe conferimos a senha contra uma impressão falsa (mesmo trabalho)
let dummyHashPromise: Promise<string> | null = null;
function dummyHash() {
  dummyHashPromise ??= hashPassword("senha-falsa-para-igualar-o-tempo");
  return dummyHashPromise;
}

// Abre uma sessão e entrega o cookie ao navegador
export async function createSession(adminId: number) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  // Aproveita para limpar sessões vencidas
  await db.delete(adminSessions).where(lt(adminSessions.expiresAt, new Date()));
  await db
    .insert(adminSessions)
    .values({ adminId, tokenHash: hashToken(token), expiresAt });

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true, // JavaScript da página não consegue ler o cookie
    secure: process.env.NODE_ENV === "production", // só por HTTPS no site publicado
    sameSite: "lax", // não vai em requisições vindas de outros sites
    path: "/",
    expires: expiresAt,
  });
}

// Encerra todas as sessões de um administrador (troca de senha, desativação)
export async function deleteAllSessions(adminId: number) {
  await db.delete(adminSessions).where(eq(adminSessions.adminId, adminId));
}

// Sai: apaga a sessão no banco e o cookie
export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    await db
      .delete(adminSessions)
      .where(eq(adminSessions.tokenHash, hashToken(token)));
  }
  store.delete(SESSION_COOKIE);
}

// Quem está logado agora (ou null). O cache() evita repetir a consulta
// quando a página, o layout e a API perguntam na mesma requisição.
export const getCurrentAdmin = cache(async (): Promise<AdminUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const [row] = await db
    .select({ id: admins.id, email: admins.email, name: admins.name })
    .from(adminSessions)
    .innerJoin(admins, eq(adminSessions.adminId, admins.id))
    .where(
      and(
        eq(adminSessions.tokenHash, hashToken(token)),
        gt(adminSessions.expiresAt, sql`now()`),
        eq(admins.active, true) // desativar alguém derruba o acesso na hora
      )
    )
    .limit(1);

  return row ?? null;
});

// Tenta entrar. Devolve o administrador, ou null para QUALQUER falha
// (e-mail inexistente, senha errada, conta desativada ou bloqueada):
// quem erra nunca fica sabendo qual foi o motivo.
export async function attemptLogin(
  emailInput: string,
  password: string
): Promise<AdminUser | null> {
  const email = emailInput.trim().toLowerCase();
  const [admin] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  const locked = admin?.lockedUntil ? admin.lockedUntil > new Date() : false;

  if (!admin || !admin.active || locked) {
    await verifyPassword(password, await dummyHash());
    return null;
  }

  if (!(await verifyPassword(password, admin.passwordHash))) {
    const failed = admin.failedAttempts + 1;
    const lock = failed >= MAX_FAILED_ATTEMPTS;
    await db
      .update(admins)
      .set({
        failedAttempts: lock ? 0 : failed,
        lockedUntil: lock
          ? new Date(Date.now() + LOCK_MINUTES * 60 * 1000)
          : null,
      })
      .where(eq(admins.id, admin.id));
    return null;
  }

  await db
    .update(admins)
    .set({ failedAttempts: 0, lockedUntil: null, lastLoginAt: new Date() })
    .where(eq(admins.id, admin.id));

  await createSession(admin.id);
  return { id: admin.id, email: admin.email, name: admin.name };
}

// A requisição veio do próprio site? Um site mal-intencionado aberto em outra
// aba não consegue fazer o navegador do administrador mandar isto.
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

// Guarda das APIs do painel. Devolve a resposta de erro (401 ou 403) se a
// pessoa não puder passar, ou null se puder. Uso:
//   const denied = await requireAdminApi(request);
//   if (denied) return denied;
export async function requireAdminApi(
  request?: Request
): Promise<NextResponse | null> {
  if (request && request.method !== "GET" && !isSameOrigin(request)) {
    return NextResponse.json({ error: "Origem não permitida." }, { status: 403 });
  }

  if (!(await getCurrentAdmin())) {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }

  return null;
}