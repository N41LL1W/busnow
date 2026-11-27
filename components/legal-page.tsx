import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";

export type LegalSection = {
  title: string;
  body: ReactNode;
};

// Moldura das páginas legais (termos e privacidade): título, data da
// última atualização e uma lista numerada de seções.
export function LegalPage({
  title,
  updatedAt,
  intro,
  sections,
}: {
  title: string;
  updatedAt: string;
  intro: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <AppShell>
      <article className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted">Atualizado em {updatedAt}</p>

        <div className="mt-4 space-y-3 leading-relaxed">{intro}</div>

        <div className="mt-8 space-y-8">
          {sections.map((section, index) => (
            <section key={section.title} aria-labelledby={`secao-${index + 1}`}>
              <h2 id={`secao-${index + 1}`} className="text-lg font-bold">
                {index + 1}. {section.title}
              </h2>
              <div className="mt-2 space-y-3 leading-relaxed">{section.body}</div>
            </section>
          ))}
        </div>
      </article>
    </AppShell>
  );
}