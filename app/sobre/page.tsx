import type { Metadata } from "next";
import { Suspense } from "react";
import { getSettings } from "@/lib/settings";
import { Branded } from "../brand";

export const metadata: Metadata = {
  title: "Sobre - BusNow",
  description: "Como funciona o acompanhamento dos circulares.",
};

async function AboutContent() {
  const settings = await getSettings();

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-4 sm:p-8">
      <section>
        <h1 className="text-2xl font-bold">Sobre o {settings.serviceName}</h1>
        <p className="mt-3 whitespace-pre-line text-slate-300">
          {settings.about ??
            `O ${settings.serviceName} mostra onde estão os circulares de ${settings.cityName}, quando o próximo ônibus chega ao seu ponto e os horários de cada linha.`}
        </p>
      </section>

      <section>
        <h2 className="text-lg font-semibold">Como funciona</h2>
        <ul className="mt-3 space-y-3 text-slate-300">
          <li>
            <strong className="text-white">Mapa:</strong> a posição dos ônibus é
            atualizada a cada poucos segundos. Toque em um ponto para ver a
            previsão de chegada.
          </li>
          <li>
            <strong className="text-white">Horários:</strong> escolha a linha, o
            dia e o ponto para ver todos os horários e o próximo ônibus.
          </li>
          <li>
            <strong className="text-white">Avisos:</strong> mudanças no serviço,
            como feriados, aparecem em uma faixa no topo.
          </li>
        </ul>
      </section>

      {(settings.phone || settings.email || settings.website) && (
        <section>
          <h2 className="text-lg font-semibold">Contato</h2>
          <ul className="mt-3 space-y-1 text-slate-300">
            {settings.phone && <li>Telefone: {settings.phone}</li>}
            {settings.email && <li>E-mail: {settings.email}</li>}
            {settings.website && (
              <li>
                <a
                  href={settings.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline"
                >
                  {settings.website}
                </a>
              </li>
            )}
          </ul>
        </section>
      )}
    </main>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900" />}>
      <Branded>
        <AboutContent />
      </Branded>
    </Suspense>
  );
}