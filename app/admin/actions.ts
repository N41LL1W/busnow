"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { admins } from "@/db/auth-schema";
import {
  attemptLogin,
  createSession,
  deleteAllSessions,
  destroySession,
  getCurrentAdmin,
} from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import type { FormState } from "./form-state";

const MAX_LENGTH = 200; // senhas gigantes só serviriam para sobrecarregar o servidor

export async function loginAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (!email || !password || email.length > MAX_LENGTH || password.length > MAX_LENGTH) {
    return { error: "Informe o e-mail e a senha." };
  }

  const admin = await attemptLogin(email, password);
  if (!admin) {
    return {
      error: "E-mail ou senha incorretos, ou conta temporariamente bloqueada.",
    };
  }

  redirect("/admin/linhas");
}

export async function logoutAction() {
  await destroySession();
  redirect("/admin/login");
}

export async function changePasswordAction(
  _previous: FormState,
  formData: FormData
): Promise<FormState> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");

  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (next.length < 10) {
    return { error: "A nova senha precisa ter pelo menos 10 caracteres." };
  }
  if (next.length > MAX_LENGTH || current.length > MAX_LENGTH) {
    return { error: "Senha longa demais." };
  }
  if (next !== confirm) {
    return { error: "A confirmação não é igual à nova senha." };
  }

  const [row] = await db
    .select({ passwordHash: admins.passwordHash })
    .from(admins)
    .where(eq(admins.id, admin.id))
    .limit(1);

  if (!row || !(await verifyPassword(current, row.passwordHash))) {
    return { error: "A senha atual está incorreta." };
  }

  await db
    .update(admins)
    .set({ passwordHash: await hashPassword(next) })
    .where(eq(admins.id, admin.id));

  // Encerra todos os acessos (inclusive de outros aparelhos) e mantém só este
  await deleteAllSessions(admin.id);
  await createSession(admin.id);

  return { ok: true };
}