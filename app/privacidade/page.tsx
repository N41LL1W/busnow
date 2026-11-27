import type { Metadata } from "next";
import { LegalPage, type LegalSection } from "@/components/legal-page";
import { LEGAL_UPDATED_AT, contactChannel, responsibleName } from "@/lib/legal";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Política de privacidade" };

// ATENÇÃO: texto-modelo. Peça a revisão de um advogado antes de publicar
// para uma prefeitura, principalmente as seções de bases legais, transferência
// internacional e prazos de guarda.
export default async function PrivacyPage() {
  const settings = await getSettings();
  const responsible = responsibleName(settings);
  const contact = contactChannel(settings);

  const sections: LegalSection[] = [
    {
      title: "Quem é o responsável",
      body: (
        <>
          <p>
            O responsável pelas decisões sobre os dados (controlador, na Lei
            Geral de Proteção de Dados, a LGPD) é {responsible}. O fornecedor
            do software atua como operador, tratando os dados só para manter o
            serviço funcionando.
          </p>
          <p>Para dúvidas e pedidos sobre dados, use: {contact}.</p>
        </>
      ),
    },
    {
      title: "Passageiros: o que não coletamos",
      body: (
        <p>
          Para usar o mapa, os horários e a previsão, você não precisa criar
          conta nem informar nome, e-mail ou telefone. O aplicativo não pede a
          sua localização, não usa publicidade e não usa ferramentas de
          rastreamento de terceiros.
        </p>
      ),
    },
    {
      title: "Passageiros: o que fica no seu aparelho",
      body: (
        <>
          <p>
            O aplicativo guarda no seu próprio aparelho, e não no servidor:
          </p>
          <ul className="list-disc space-y-1 pl-5">
            <li>o tema escolhido (claro ou escuro);</li>
            <li>o ponto de ônibus que você marcou como &quot;meu ponto&quot;;</li>
            <li>arquivos do aplicativo e uma página de &quot;sem conexão&quot;, para carregar mais rápido.</li>
          </ul>
          <p>
            Você pode apagar isso a qualquer momento limpando os dados do site
            no navegador.
          </p>
        </>
      ),
    },
    {
      title: "Dados técnicos de acesso",
      body: (
        <p>
          Como em qualquer site, os servidores e o provedor de hospedagem podem
          registrar dados técnicos de acesso, como endereço IP, tipo de
          navegador e horário, para segurança e funcionamento. O mapa também é
          carregado do OpenStreetMap, que recebe o endereço IP do seu aparelho
          ao entregar as imagens do mapa, conforme a política de privacidade
          dessa fundação.
        </p>
      ),
    },
    {
      title: "Administradores do serviço",
      body: (
        <>
          <p>
            Para as pessoas autorizadas a usar o painel, tratamos: nome, e-mail
            e senha (guardada de forma irreversível, nunca em texto aberto);
            um cookie de sessão, que dura 7 dias; e um registro das ações
            feitas no painel (quem fez, o quê e quando).
          </p>
          <p>
            Essas informações servem para controlar o acesso, proteger o
            serviço e prestar contas. Não são usadas para outra finalidade.
          </p>
        </>
      ),
    },
    {
      title: "Com quem os dados são compartilhados",
      body: (
        <p>
          Não vendemos dados. O serviço usa empresas de infraestrutura para
          hospedagem e banco de dados, que processam os dados em nosso nome e
          podem fazê-lo fora do Brasil. Nesses casos, a transferência segue as
          regras da LGPD. Dados também podem ser fornecidos a autoridades quando
          a lei exigir.
        </p>
      ),
    },
    {
      title: "Por quanto tempo guardamos",
      body: (
        <p>
          Os dados dos administradores ficam enquanto o acesso estiver ativo.
          O registro de atividades é mantido pelo período definido pelo
          responsável pelo serviço, para fins de prestação de contas. Dados
          técnicos de acesso seguem os prazos do provedor de hospedagem.
        </p>
      ),
    },
    {
      title: "Seus direitos",
      body: (
        <>
          <p>
            Pela LGPD, você pode pedir: confirmação de que tratamos seus dados,
            acesso, correção, eliminação quando cabível, informação sobre
            compartilhamento e revisão de decisões. Passageiros, em geral, não
            têm dados nossos para consultar, já que não há cadastro.
          </p>
          <p>
            Faça o pedido por: {contact}. Se não ficar satisfeito, você pode
            recorrer à Autoridade Nacional de Proteção de Dados (ANPD).
          </p>
        </>
      ),
    },
    {
      title: "Segurança",
      body: (
        <p>
          Adotamos medidas como conexão criptografada (HTTPS), senhas
          protegidas, bloqueio após tentativas erradas de login e registro das
          ações no painel. Nenhum sistema é totalmente imune; em caso de
          incidente que envolva dados pessoais, o responsável avisará as
          pessoas afetadas e a ANPD, quando exigido por lei.
        </p>
      ),
    },
    {
      title: "Mudanças nesta política",
      body: (
        <p>
          Esta política pode ser atualizada. A data no topo da página mostra a
          última revisão.
        </p>
      ),
    },
  ];

  return (
    <LegalPage
      title="Política de privacidade"
      updatedAt={LEGAL_UPDATED_AT}
      intro={
        <p>
          Explicamos aqui, em linguagem simples, quais dados o{" "}
          {settings.serviceName} trata e por quê. O serviço foi feito para
          coletar o mínimo possível.
        </p>
      }
      sections={sections}
    />
  );
}