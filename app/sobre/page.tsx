import type { Metadata } from "next";
import { NoticeBanner } from "@/components/notice-banner";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Sobre" };

export default async function AboutPage() {
  const settings = await getSettings();

  // O texto "Sobre" do painel: cada bloco separado por linha em branco vira um parágrafo
  const paragraphs = settings.aboutText
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const contacts: { label: string; content: React.ReactNode }[] = [];

  if (settings.contactPhone) {
    contacts.push({
      label: "Telefone",
      content: (
        <a
          href={`tel:${settings.contactPhone.replace(/[^\d+]/g, "")}`}
          className="underline"
        >
          {settings.contactPhone}
        </a>
      ),
    });
  }
  if (settings.contactEmail) {
    contacts.push({
      label: "E-mail",
      content: (
        <a href={`mailto:${settings.contactEmail}`} className="underline">
          {settings.contactEmail}
        </a>
      ),
    });
  }
  if (settings.contactSite) {
    contacts.push({
      label: "Site",
      content: (
        <a
          href={settings.contactSite}
          target="_blank"
          rel="noopener noreferrer"
          className="underline"
        >
          {settings.contactSite}
        </a>
      ),
    });
  }
  if (settings.contactHours) {
    contacts.push({ label: "Atendimento", content: settings.contactHours });
  }
  if (settings.contactAddress) {
    contacts.push({ label: "Endereço", content: settings.contactAddress });
  }

  return (
    <main className="min-h-screen bg-slate-900 p-4 text-white sm:p-8">
      <SiteHeader />
      <NoticeBanner />

      <h1 className="mb-4 text-2xl font-bold">Sobre o serviço</h1>

      <div className="max-w-2xl space-y-3 text-slate-200">
        {paragraphs.length > 0 ? (
          paragraphs.map((paragraph, index) => (
            <p key={index} className="whitespace-pre-line">
              {paragraph}
            </p>
          ))
        ) : (
          <p>
            Acompanhe os horários e a posição dos ônibus em tempo real, direto
            no celular.
          </p>
        )}
      </div>

      {contacts.length > 0 && (
        <section className="mt-6 max-w-2xl rounded-lg bg-slate-800 p-4">
          <h2 className="mb-3 text-lg font-semibold">Contato</h2>
          <dl className="space-y-2 text-sm">
            {contacts.map((contact) => (
              <div key={contact.label} className="flex flex-wrap gap-x-3">
                <dt className="w-28 shrink-0 text-slate-400">{contact.label}</dt>
                <dd className="min-w-0 wrap-break-word">{contact.content}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <SiteFooter />
    </main>
  );
}