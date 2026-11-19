import { redirect } from "next/navigation";
import { getCurrentAdmin, type AdminUser } from "@/lib/auth";

// Para usar no começo de cada ação do painel: sem login, vai para a entrada
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}