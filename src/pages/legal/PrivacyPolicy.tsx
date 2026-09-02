import { LegalLayout } from "@/components/LegalLayout";

const PrivacyPolicy = () => (
  <LegalLayout
    title="Política de Privacidade"
    subtitle="Como tratamos seus dados pessoais, conforme a LGPD (Lei nº 13.709/2018)."
    updatedAt="2 de setembro de 2026"
  >
    <div>
      <h2>1. Controlador</h2>
      <p>
        O GeoData Brasil é o controlador dos dados pessoais tratados na plataforma. Contato do encarregado
        (DPO): <a href="mailto:privacidade@geodatabrasil.com">privacidade@geodatabrasil.com</a>.
      </p>
    </div>

    <div>
      <h2>2. Dados que coletamos</h2>
      <ul>
        <li><strong>Cadastro:</strong> nome, e-mail e senha (armazenada de forma criptografada pelo provedor de autenticação).</li>
        <li><strong>Assinatura:</strong> plano, ciclo de cobrança, status, datas de vigência e histórico de pagamentos.</li>
        <li><strong>Pagamento:</strong> identificador e método da transação recebidos do provedor. Não recebemos nem armazenamos o número do cartão.</li>
        <li><strong>Uso técnico:</strong> registros de acesso e requisições necessárias à segurança e ao funcionamento do serviço.</li>
      </ul>
    </div>

    <div>
      <h2>3. Finalidades e bases legais</h2>
      <ul>
        <li><strong>Execução de contrato:</strong> criar e manter sua conta, liberar o acesso conforme o plano e processar pagamentos.</li>
        <li><strong>Obrigação legal:</strong> guarda de registros de acesso, nos termos do Marco Civil da Internet.</li>
        <li><strong>Legítimo interesse:</strong> segurança, prevenção a fraudes e melhoria da plataforma.</li>
        <li><strong>Consentimento:</strong> comunicações opcionais, quando aplicável — revogável a qualquer momento.</li>
      </ul>
    </div>

    <div>
      <h2>4. Compartilhamento</h2>
      <p>Seus dados são compartilhados apenas com operadores necessários ao serviço:</p>
      <ul>
        <li>Provedor de infraestrutura, banco de dados e autenticação (hospedagem em nuvem);</li>
        <li>Provedor de pagamentos (Mercado Pago), para processar assinaturas;</li>
        <li>Autoridades públicas, quando exigido por lei ou ordem judicial.</li>
      </ul>
      <p>Não vendemos nem cedemos dados pessoais para fins publicitários de terceiros.</p>
    </div>

    <div>
      <h2>5. Retenção</h2>
      <p>
        Mantemos os dados de conta enquanto a conta existir. Registros financeiros e de acesso são mantidos pelos
        prazos legais aplicáveis, mesmo após o encerramento da conta, e depois eliminados ou anonimizados.
      </p>
    </div>

    <div>
      <h2>6. Seus direitos</h2>
      <p>Nos termos da LGPD, você pode solicitar a qualquer momento:</p>
      <ul>
        <li>Confirmação da existência de tratamento e acesso aos dados;</li>
        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
        <li>Anonimização, bloqueio ou eliminação de dados desnecessários;</li>
        <li>Portabilidade, informação sobre compartilhamentos e revogação do consentimento;</li>
        <li>Exclusão da conta — disponível diretamente na página "Meu perfil".</li>
      </ul>
      <p>
        Pedidos podem ser enviados para <a href="mailto:privacidade@geodatabrasil.com">privacidade@geodatabrasil.com</a>.
      </p>
    </div>

    <div>
      <h2>7. Segurança</h2>
      <p>
        Adotamos medidas técnicas e administrativas como criptografia em trânsito, controle de acesso por perfil,
        regras de segurança em nível de linha no banco de dados e proteção contra senhas vazadas no cadastro.
        Nenhum sistema é totalmente imune a incidentes; comunicaremos os titulares e a ANPD quando exigido.
      </p>
    </div>

    <div>
      <h2>8. Cookies</h2>
      <p>
        Utilizamos cookies e armazenamento local essenciais ao funcionamento da plataforma. Detalhes na
        <a href="/politica-de-cookies"> Política de Cookies</a>.
      </p>
    </div>

    <div>
      <h2>9. Alterações</h2>
      <p>
        Esta política pode ser atualizada. Mudanças relevantes serão informadas na plataforma ou por e-mail.
      </p>
    </div>
  </LegalLayout>
);

export default PrivacyPolicy;
