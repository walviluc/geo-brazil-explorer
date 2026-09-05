import { LegalLayout } from "@/components/LegalLayout";

const TermsOfUse = () => (
  <LegalLayout
    title="Termos de Uso"
    subtitle="Condições gerais para utilização do portal GeoData Brasil."
    updatedAt="2 de setembro de 2026"
  >
    <div>
      <h2>1. Aceitação dos termos</h2>
      <p>
        O GeoData Brasil (geodadosbrasil.com.br) é um serviço operado pela Loja dos Mapas
        (contato@lojadosmapas.com.br). Ao criar uma conta, acessar ou utilizar o GeoData Brasil
        ("plataforma"), você declara que leu, compreendeu e concorda integralmente com estes Termos
        de Uso e com a Política de Privacidade. Caso não concorde, não utilize a plataforma.
      </p>
    </div>

    <div>
      <h2>2. Descrição do serviço</h2>
      <p>
        O GeoData Brasil é um portal de consulta, visualização e download de dados geoespaciais do Brasil.
        A plataforma oferece dois tipos de conteúdo:
      </p>
      <ul>
        <li>
          <strong>Fontes públicas oficiais</strong> — serviços WMS/WFS de órgãos como IBGE, INPE, ICMBio, MMA,
          ANP, CPRM, EMBRAPA e outros, acessados por intermédio da plataforma e disponibilizados gratuitamente
          a usuários autenticados.
        </li>
        <li>
          <strong>Catálogo Premium</strong> — camadas próprias, curadas e hospedadas pela plataforma, organizadas
          por unidade federativa, disponíveis conforme o plano contratado.
        </li>
      </ul>
    </div>

    <div>
      <h2>3. Cadastro e conta</h2>
      <ul>
        <li>O acesso aos dados exige cadastro com e-mail válido; novos usuários iniciam no plano Gratuito.</li>
        <li>Você é responsável pela veracidade dos dados informados e pelo sigilo das suas credenciais.</li>
        <li>É proibido compartilhar a conta, revender acessos ou criar contas em nome de terceiros sem autorização.</li>
        <li>Podemos suspender ou encerrar contas que violem estes Termos ou a legislação aplicável.</li>
      </ul>
    </div>

    <div>
      <h2>4. Planos, preços e pagamento</h2>
      <ul>
        <li>Os planos, preços e itens inclusos são exibidos na seção "Planos de Acesso" e na página de assinatura.</li>
        <li>Os pagamentos são processados por provedor externo (Mercado Pago); não armazenamos dados de cartão.</li>
        <li>Assinaturas são cobradas no ciclo escolhido (mensal ou anual) e valem até a data de expiração indicada.</li>
        <li>Alterações de preço não afetam ciclos já pagos e serão comunicadas com antecedência.</li>
      </ul>
    </div>

    <div>
      <h2>5. Uso permitido</h2>
      <p>Ao utilizar a plataforma, você se compromete a não:</p>
      <ul>
        <li>Realizar raspagem automatizada, requisições em massa ou qualquer uso que degrade o serviço;</li>
        <li>Redistribuir, revender ou publicar as camadas do Catálogo Premium a terceiros;</li>
        <li>Tentar burlar controles de acesso, autenticação ou restrições por plano;</li>
        <li>Utilizar os dados para finalidades ilícitas ou que violem direitos de terceiros.</li>
      </ul>
    </div>

    <div>
      <h2>6. Propriedade intelectual</h2>
      <p>
        A marca, o software, a interface e o Catálogo Premium são de titularidade do GeoData Brasil.
        Os dados públicos permanecem de titularidade e responsabilidade dos órgãos de origem, nos termos da
        <a href="/licenca-de-dados"> Licença e Uso dos Dados</a>.
      </p>
    </div>

    <div>
      <h2>7. Disponibilidade e limitação de responsabilidade</h2>
      <ul>
        <li>
          A plataforma depende de serviços externos (WMS/WFS de órgãos públicos) que podem ficar indisponíveis,
          alterar suas camadas ou apresentar instabilidade sem aviso prévio.
        </li>
        <li>
          Os dados são fornecidos "no estado em que se encontram", sem garantia de exatidão, atualidade ou
          adequação a uma finalidade específica.
        </li>
        <li>
          Não nos responsabilizamos por decisões técnicas, jurídicas, ambientais ou econômicas tomadas com base
          nos dados obtidos por meio da plataforma.
        </li>
      </ul>
    </div>

    <div>
      <h2>8. Alterações dos termos</h2>
      <p>
        Estes Termos podem ser atualizados a qualquer momento. A data da última atualização é indicada no topo
        da página e o uso continuado da plataforma após a publicação implica concordância com a nova versão.
      </p>
    </div>

    <div>
      <h2>9. Legislação e foro</h2>
      <p>
        Aplica-se a legislação brasileira, em especial o Marco Civil da Internet (Lei nº 12.965/2014), o Código de
        Defesa do Consumidor (Lei nº 8.078/1990) e a LGPD (Lei nº 13.709/2018). Fica eleito o foro do domicílio do
        usuário para dirimir controvérsias.
      </p>
    </div>

    <div>
      <h2>10. Contato</h2>
      <p>
        Dúvidas sobre estes Termos: <a href="mailto:contato@lojadosmapas.com.br">contato@lojadosmapas.com.br</a>.
      </p>
    </div>
  </LegalLayout>
);

export default TermsOfUse;
