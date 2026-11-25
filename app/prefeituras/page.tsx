import type { Metadata } from "next";
import Link from "next/link";
import { AppShell } from "@/components/app-shell";

export const metadata: Metadata = {
  title: "Para prefeituras",
  description:
    "Acompanhamento do transporte público pelo celular: horários, mapa e previsão de chegada, com painel de administração próprio da prefeitura.",
};

// E-mail para quem tem interesse. Fica numa variável de ambiente (Vercel e
// .env.local), então dá para trocar sem mexer no código.
const CONTACT_EMAIL = process.env.SALES_CONTACT_EMAIL?.trim() || null;

const PASSENGER_FEATURES = [
  {
    title: "Mapa com os ônibus",
    text: "Posição dos veículos e dos pontos, no celular, sem baixar nada na loja de aplicativos.",
  },
  {
    title: "Previsão de chegada",
    text: "O passageiro escolhe o ponto onde espera e vê em quantos minutos o próximo ônibus chega.",
  },
  {
    title: "Meu ponto",
    text: "O ponto favorito fica salvo no próprio aparelho. Ao abrir, a previsão já aparece.",
  },
  {
    title: "Horários completos",
    text: "Tabela por linha e por ponto, com dia útil, sábado, domingo e feriados.",
  },
  {
    title: "Instala como aplicativo",
    text: "Funciona como PWA: o passageiro adiciona à tela inicial e abre como um app.",
  },
  {
    title: "Claro e escuro",
    text: "Acompanha o tema do celular e pode ser trocado na hora. Boa leitura de dia e à noite.",
  },
] as const;

const ADMIN_FEATURES = [
  {
    title: "Identidade da prefeitura",
    text: "Nome, cidade, logotipo, cor e textos institucionais, tudo pelo painel. O app fica com a cara do município.",
  },
  {
    title: "Avisos de serviço",
    text: "Greve, desvio, feriado: o aviso aparece no topo do app no período que você marcar.",
  },
  {
    title: "Linhas, paradas e horários",
    text: "Desenho do trajeto no mapa, minutos de cada parada, saídas por dia da semana e calendário de feriados.",
  },
  {
    title: "Veículos",
    text: "Cadastro da frota e ligação de cada veículo à sua linha.",
  },
  {
    title: "Registro de atividades",
    text: "Cada mudança no painel fica registrada: quem fez, o quê e quando. Útil para prestação de contas.",
  },
  {
    title: "Acesso protegido",
    text: "Login com senha forte, bloqueio após tentativas erradas e encerramento de sessões ao trocar a senha.",
  },
] as const;

const STEPS = [
  {
    title: "A empresa de ônibus envia a posição",
    text: "O rastreador dos veículos fornece a localização por uma API. Quem já tem o contrato de rastreamento só precisa liberar esse acesso.",
  },
  {
    title: "O BusNow calcula a previsão",
    text: "Com o trajeto e a tabela de horários da prefeitura, o sistema estima a chegada em cada ponto.",
  },
  {
    title: "O passageiro acompanha",
    text: "Pelo celular, em qualquer navegador, sem cadastro e sem instalar nada.",
  },
] as const;

const CHECKLIST = [
  "Linhas, pontos e horários (os PDFs que já existem servem de partida).",
  "Contato com a empresa de rastreamento para liberar a API de posições.",
  "Logotipo e cor da prefeitura.",
  "Textos de apresentação e contatos da secretaria responsável.",
] as const;

const FAQ = [
  {
    question: "O passageiro precisa criar conta?",
    answer:
      "Não. O app abre direto. O ponto favorito fica guardado só no aparelho de quem usa, não vai para o servidor.",
  },
  {
    question: "O sistema coleta dados pessoais dos passageiros?",
    answer:
      "Não há cadastro, login nem localização do passageiro. Os dados pessoais ficam restritos aos administradores do painel (nome e e-mail), e as ações deles são registradas.",
  },
  {
    question: "Preciso trocar o rastreador dos ônibus?",
    answer:
      "Em geral não. O que importa é a empresa de rastreamento oferecer uma API (ou outra forma de enviar as posições). Enquanto isso não existe, o sistema funciona em modo de demonstração, com posições simuladas a partir da tabela de horários, e o app avisa isso ao passageiro.",
  },
  {
    question: "E se o ônibus mudar de trajeto ou de horário?",
    answer:
      "A própria equipe da prefeitura altera pelo painel, sem depender de programador, e a mudança aparece no app na hora.",
  },
  {
    question: "Dá para ver como é antes de decidir?",
    answer:
      "Sim: o aplicativo desta página está funcionando. Abra o mapa e os horários e veja a experiência do passageiro.",
  },
] as const;

function SectionTitle({
  id,
  eyebrow,
  title,
  text,
}: {
  id: string;
  eyebrow: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="max-w-2xl">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
        {eyebrow}
      </p>
      <h2 id={id} className="mt-1 text-2xl font-bold sm:text-3xl">{title}</h2>
      {text && <p className="mt-2 text-muted">{text}</p>}
    </div>
  );
}

function FeatureGrid({
  items,
}: {
  items: readonly { title: string; text: string }[];
}) {
  return (
    <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.title} className="rounded-2xl border border-line bg-card p-5">
          <h3 className="font-semibold">{item.title}</h3>
          <p className="mt-1 text-sm text-muted">{item.text}</p>
        </li>
      ))}
    </ul>
  );
}

export default function MunicipalitiesPage() {
  const mailto = CONTACT_EMAIL
    ? `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("BusNow para a minha prefeitura")}`
    : null;

  return (
    <AppShell>
      {/* Abertura */}
      <section className="border-b border-line bg-card-2">
        <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-ink">
            Para prefeituras
          </p>
          <h1 className="mt-2 max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">
            O transporte público da sua cidade, na palma da mão do passageiro
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-muted">
            Mapa, horários e previsão de chegada num aplicativo que abre no
            navegador do celular, com painel de administração para a própria
            prefeitura cuidar de tudo.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex min-h-12 items-center rounded-xl bg-brand px-6 font-semibold text-white"
            >
              Ver o aplicativo funcionando
            </Link>
            {mailto && (
              <a
                href={mailto}
                className="inline-flex min-h-12 items-center rounded-xl border border-line bg-card px-6 font-semibold"
              >
                Conversar sobre o BusNow
              </a>
            )}
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-5xl space-y-16 px-4 py-12 sm:px-6 sm:py-16">
        {/* Passageiro */}
        <section aria-labelledby="passageiro">
          <SectionTitle
            id="passageiro"
            eyebrow="Para o passageiro"
            title="Menos espera sem informação"
            text="O passageiro sabe quando o ônibus chega e planeja o dia com mais segurança."
          />
          <FeatureGrid items={PASSENGER_FEATURES} />
        </section>

        {/* Prefeitura */}
        <section aria-labelledby="prefeitura">
          <SectionTitle
            id="prefeitura"
            eyebrow="Para a prefeitura"
            title="Você no controle, sem depender de programador"
            text="O painel foi pensado para a equipe da secretaria: simples, no celular ou no computador."
          />
          <FeatureGrid items={ADMIN_FEATURES} />
        </section>

        {/* Como funciona */}
        <section aria-labelledby="como-funciona">
          <SectionTitle id="como-funciona" eyebrow="Como funciona" title="Três passos" />
          <ol className="mt-6 grid gap-3 md:grid-cols-3">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                className="rounded-2xl border border-line bg-card p-5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-brand font-bold text-white"
                >
                  {index + 1}
                </span>
                <h3 className="mt-3 font-semibold">{step.title}</h3>
                <p className="mt-1 text-sm text-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* Para começar */}
        <section
          aria-labelledby="comecar"
          className="rounded-3xl border border-line bg-card p-6 sm:p-8"
        >
          <SectionTitle
            id="comecar"
            eyebrow="Para começar"
            title="O que a prefeitura precisa reunir"
          />
          <ul className="mt-5 space-y-3">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex gap-3 text-sm">
                <span
                  aria-hidden="true"
                  className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand text-xs font-bold text-white"
                >
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Perguntas */}
        <section aria-labelledby="perguntas">
          <SectionTitle id="perguntas" eyebrow="Perguntas frequentes" title="Dúvidas comuns" />
          <div className="mt-6 divide-y divide-line rounded-2xl border border-line bg-card">
            {FAQ.map((item) => (
              <details key={item.question} className="group p-5">
                <summary className="flex min-h-8 cursor-pointer list-none items-center justify-between gap-3 font-semibold">
                  {item.question}
                  <span
                    aria-hidden="true"
                    className="text-muted transition-transform group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="mt-2 text-sm text-muted">{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Contato */}
        <section
          aria-labelledby="contato"
          className="rounded-3xl bg-brand p-6 text-white sm:p-10"
        >
          <h2 id="contato" className="text-2xl font-bold sm:text-3xl">
            Quer levar o BusNow para a sua cidade?
          </h2>
          <p className="mt-2 max-w-2xl text-white/90">
            Conte qual é a sua cidade e como é o transporte hoje. Respondemos
            com os próximos passos.
          </p>
          {mailto ? (
            <a
              href={mailto}
              className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-white px-6 font-semibold text-slate-900"
            >
              Enviar e-mail: {CONTACT_EMAIL}
            </a>
          ) : (
            <p className="mt-6 text-sm text-white/90">
              Contato em breve.
            </p>
          )}
        </section>
      </div>
    </AppShell>
  );
}