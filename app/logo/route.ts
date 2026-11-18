import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/settings-schema";

export async function GET() {
  await connection();

  const [row] = await db
    .select({ data: siteSettings.logoData, type: siteSettings.logoType })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  if (!row?.data || !row.type) {
    return new Response("Sem logo.", { status: 404 });
  }

  return new Response(new Uint8Array(Buffer.from(row.data, "base64")), {
    headers: {
      "Content-Type": row.type,
      "Cache-Control": "public, max-age=3600",
      // o navegador não pode "adivinhar" outro tipo de arquivo
      "X-Content-Type-Options": "nosniff",
    },
  });
}