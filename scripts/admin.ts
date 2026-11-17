import { config } from "dotenv";
import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { hashPassword } from "../lib/password";

config({ path: ".env.local" });

const USAGE = `Uso:
  npm run admin -- list
  npm run admin -- create <email> <nome>
  npm run admin -- reset <email>
  npm run admin -- disable <email>
  npm run admin -- enable <email>`;

// Senha sorteada, sem caracteres que se confundem (0/O, 1/l/I)
function generatePassword(length = 16): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
  return Array.from({ length }, () => alphabet[randomInt(alphabet.length)]).join("");
}

async function main() {
  const [command, emailArg, ...nameParts] = process.argv.slice(2);

  if (!command) {
    console.log(USAGE);
    process.exit(1);
  }

  // Import dinâmico: garante que o .env.local já foi carregado
  const { db } = await import("../db/index");
  const { admins, adminSessions } = await import("../db/auth-schema");

  if (command === "list") {
    const rows = await db.select().from(admins).orderBy(admins.id);
    if (rows.length === 0) console.log("Nenhum administrador cadastrado.");
    for (const row of rows) {
      console.log(
        `${row.active ? "ativo  " : "INATIVO"}  ${row.email}  (${row.name})  último acesso: ${
          row.lastLoginAt ? row.lastLoginAt.toISOString() : "nunca"
        }`
      );
    }
    return;
  }

  const email = emailArg?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    console.error("Informe um e-mail válido.\n" + USAGE);
    process.exit(1);
  }

  const [existing] = await db
    .select()
    .from(admins)
    .where(eq(admins.email, email))
    .limit(1);

  if (command === "create") {
    const name = nameParts.join(" ").trim();
    if (!name) {
      console.error("Informe o nome da pessoa.\n" + USAGE);
      process.exit(1);
    }
    if (existing) {
      console.error("Já existe um administrador com este e-mail.");
      process.exit(1);
    }

    const password = generatePassword();
    await db
      .insert(admins)
      .values({ email, name, passwordHash: await hashPassword(password) });

    console.log("Administrador criado.");
    console.log(`  E-mail: ${email}`);
    console.log(`  Senha temporária: ${password}`);
    console.log(
      "Guarde a senha agora: ela não será mostrada de novo. Peça para a pessoa trocá-la no primeiro acesso (botão Trocar senha)."
    );
    return;
  }

  if (!existing) {
    console.error("Administrador não encontrado.");
    process.exit(1);
  }

  if (command === "reset") {
    const password = generatePassword();
    await db
      .update(admins)
      .set({
        passwordHash: await hashPassword(password),
        failedAttempts: 0,
        lockedUntil: null,
      })
      .where(eq(admins.id, existing.id));
    await db.delete(adminSessions).where(eq(adminSessions.adminId, existing.id));

    console.log(`Nova senha temporária de ${email}: ${password}`);
    console.log("Todos os acessos anteriores dessa pessoa foram encerrados.");
  } else if (command === "disable") {
    await db.update(admins).set({ active: false }).where(eq(admins.id, existing.id));
    await db.delete(adminSessions).where(eq(adminSessions.adminId, existing.id));
    console.log(`${email} desativado. Os acessos dessa pessoa foram encerrados.`);
  } else if (command === "enable") {
    await db
      .update(admins)
      .set({ active: true, failedAttempts: 0, lockedUntil: null })
      .where(eq(admins.id, existing.id));
    console.log(`${email} reativado.`);
  } else {
    console.error(`Comando desconhecido: ${command}\n` + USAGE);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});