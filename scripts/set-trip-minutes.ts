import { config } from "dotenv";
import { eq } from "drizzle-orm";
import { lines as lineData } from "../db/data/lines";

config({ path: ".env.local" });

async function main() {
  // Import dinâmico: garante que o .env.local já foi carregado
  const { db } = await import("../db/index");
  const { lines } = await import("../db/schema");

  for (const line of lineData) {
    const updated = await db
      .update(lines)
      .set({ tripMinutes: line.returnOffset })
      .where(eq(lines.code, line.code))
      .returning({ id: lines.id });

    console.log(
      `${line.code}: ${
        updated.length > 0
          ? `volta em ${line.returnOffset} min`
          : "linha não encontrada no banco"
      }`
    );
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});