import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { getCurrentAdmin } from "@/lib/auth";
import { logoutAction } from "./actions";

export const metadata: Metadata = {
  title: "Painel",
  robots: { index: false, follow: false },
};

async function AdminBar() {
  const admin = await getCurrentAdmin();
  if (!admin) return null;

  return (
    <nav
      aria-label="Menu do painel"
      className="fixed bottom-3 left-1/2 z-2000 flex max-w-[95vw] -translate-x-1/2 flex-wrap items-center justify-center gap-x-4 gap-y-1 rounded-2xl bg-slate-900/95 px-4 py-2 text-xs text-white shadow-lg"
    >
      <span className="text-slate-400">{admin.name}</span>
      <Link href="/admin/linhas" className="text-blue-300">
        Linhas
      </Link>
      <Link href="/admin/horarios" className="text-blue-300">
        Horários
      </Link>
      <Link href="/admin/aparencia" className="text-blue-300">
        Aparência
      </Link>
      <Link href="/admin/avisos" className="text-blue-300">
        Avisos
      </Link>
      <Link href="/admin/senha" className="text-blue-300">
        Senha
      </Link>
      <Link href="/" target="_blank" className="text-blue-300">
        Ver o app
      </Link>
      <form action={logoutAction}>
        <button type="submit" className="text-red-300">
          Sair
        </button>
      </form>
    </nav>
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