import type { ReactNode } from "react";
import { BottomNav } from "./nav-links";
import { NoticeBanner } from "./notice-banner";
import { SiteFooter } from "./site-footer";
import { SiteHeader } from "./site-header";

// Moldura comum das telas do passageiro: cabeçalho, avisos, conteúdo,
// rodapé e a barra de abas do celular.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-page text-ink">
      <SiteHeader />
      <NoticeBanner />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <BottomNav />
    </div>
  );
}