import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage, type LegalSection } from "@/components/legal-page";
import { LEGAL_UPDATED_AT, responsibleName } from "@/lib/legal";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Termos de uso" };

// ATENÇÃO: texto-modelo. Peça a revisão de um advogado antes de publicar
// para uma prefeitura, principalmente as seções de responsabilidade e foro.
export default async function TermsPage() {
  const settings = await getSettings();
  const responsible = responsibleName(settings);

  const sections: LegalSection[] = [
    {
      title: "O que é o serviço",
      body: (
        <p>
          O {settings.serviceName} mostra, no celular ou no computador, o mapa,
          os horários e a previsão de chegada dos ônibus do transporte coletivo.
          O serviço é oferecido por {responsible} e é gratuito para o passageiro.
        </p>
      ),
    },
    {
      title: "As informações são estimativas",
      body: (
        <>
          <p>
            As previsões de chegada são calculadas a partir da tabela de
            horários e, quando disponível, da posição informada pelos veículos.
            Trânsito, desvios, quebras e atrasos podem fazer o ônibus chegar
            antes ou depois do previsto.
          </p>
          <p>
            Quando a posição dos veículos for simulada ou estimada, e não
            fornecida em tempo real, o aplicativo avisa na tela. Use as
            informações como orientação, não como garantia de horário.
          </p>
        </>
      ),
    },
    {
      title: "Disponibilidade",
      body: (
        <p>
          O serviço pode ficar temporariamente indisponível por manutenção,
          falhas de internet, de provedores de infraestrutura ou da fonte das
          posições. Não garantimos funcionamento ininterrupto.
        </p>
      ),
    },
    {
      title: "Uso adequado",
      body: (
        <>
          <p>Ao usar o serviço, você concorda em não:</p>
          <ul className="list-disc space-y-1 pl-5">
            <li>tentar acessar áreas restritas, como o painel de administração, sem autorização;</li>
            <li>sobrecarregar o serviço com acessos automatizados abusivos;</li>
            <li>copiar, alterar ou revender o software;</li>
            <li>usar o serviço para fins ilegais.</li>
          </ul>
        </>
      ),
    },
    {
      title: "Administradores",
      body: (
        <p>
          O painel de administração é de uso exclusivo de pessoas autorizadas
          por {responsible}. Cada administrador deve manter sua senha em sigilo
          e não compartilhá-la. As ações feitas no painel ficam registradas.
          Quem perder o acesso ou suspeitar de uso indevido deve avisar de
          imediato o responsável pelo serviço.
        </p>
      ),
    },
    {
      title: "Propriedade intelectual",
      body: (
        <p>
          O software {settings.serviceName} é protegido por lei e pertence ao
          seu titular. Nomes, brasões e logotipos exibidos como identidade do
          município pertencem ao próprio município. O mapa usa dados do
          OpenStreetMap, © colaboradores do OpenStreetMap, sob a licença ODbL.
        </p>
      ),
    },
    {
      title: "Responsabilidade",
      body: (
        <p>
          Nos limites da lei, {responsible} e o fornecedor do software não
          respondem por prejuízos causados por decisões tomadas com base nas
          previsões, como perder um ônibus ou um compromisso. Isso não afasta
          direitos que a lei garante a você.
        </p>
      ),
    },
    {
      title: "Privacidade",
      body: (
        <p>
          O tratamento de dados está descrito na{" "}
          <Link href="/privacidade" className="font-medium text-brand-ink underline">
            Política de Privacidade
          </Link>
          .
        </p>
      ),
    },
    {
      title: "Mudanças nestes termos",
      body: (
        <p>
          Estes termos podem ser atualizados. A data no topo da página mostra a
          última revisão. Continuar usando o serviço depois da mudança significa
          que você aceitou o novo texto.
        </p>
      ),
    },
    {
      title: "Lei aplicável e foro",
      body: (
        <p>
          Estes termos seguem as leis do Brasil. Eventuais conflitos serão
          resolvidos no foro da comarca do município responsável pelo serviço.
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      title="Termos de uso"
      updatedAt={LEGAL_UPDATED_AT}
      intro={
        <p>
          Estes termos explicam as regras para usar o {settings.serviceName}.
          Ao usar o serviço, você concorda com elas.
        </p>
      }
      sections={sections}
    />
  );
}