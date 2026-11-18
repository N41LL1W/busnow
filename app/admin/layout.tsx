import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/lib/auth";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Admin - BusNow",
  robots: { index: false, follow: false },
};

async function AdminBar() {
  const admin = await getCurrentAdmin();
  if (!admin) return null;

  return (
    <div className="fixed bottom-3 left-3 z-[2000] flex flex-wrap items-center gap-x-3 gap-y-1 rounded-2xl bg-slate-900/90 px-4 py-2 text-xs text-white shadow-lg md:left-[21rem]">
      <span className="font-semibold">{admin.name}</span>
      <Link href="/admin/linhas" className="text-blue-300">
        Linhas
      </Link>
      <Link href="/admin/aparencia" className="text-blue-300">
        Aparência
      </Link>
      <Link href="/admin/avisos" className="text-blue-300">
        Avisos
      </Link>
      <Link href="/admin/senha" className="text-blue-300">
        Trocar senha
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="text-red-300">
          Sair
        </button>
      </form>
    </div>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      {/* Suspense: descobrir quem está logado depende do pedido de cada pessoa */}
      <Suspense fallback={null}>
        <AdminBar />
      </Suspense>
    </>
  );
}