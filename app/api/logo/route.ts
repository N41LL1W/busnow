import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { siteSettings } from "@/db/settings-schema";

export async function GET() {
  await connection();

  const [row] = await db
    .select({ data: siteSettings.logoBase64, type: siteSettings.logoType })
    .from(siteSettings)
    .where(eq(siteSettings.id, 1))
    .limit(1);

  if (!row?.data || !row.type) {
    return new Response("Sem logotipo.", { status: 404 });
  }

  return new Response(new Uint8Array(Buffer.from(row.data, "base64")), {
    headers: {
      "Content-Type": row.type,
      // A URL muda (?v=) quando o logotipo muda, então pode ficar em cache
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}