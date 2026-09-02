import { LegalLayout } from "@/components/LegalLayout";

const RefundPolicy = () => (
  <LegalLayout
    title="Política de Reembolso e Cancelamento"
    subtitle="Regras de arrependimento, cancelamento de assinatura e estorno."
    updatedAt="2 de setembro de 2026"
  >
    <div>
      <h2>1. Direito de arrependimento</h2>
      <p>
        Conforme o art. 49 do Código de Defesa do Consumidor, você pode desistir da contratação em até
        <strong> 7 (sete) dias corridos</strong> contados do pagamento, com devolução integral do valor pago.
        Basta solicitar por e-mail, sem necessidade de justificativa.
      </p>
    </div>

    <div>
      <h2>2. Cancelamento após o prazo de arrependimento</h2>
      <ul>
        <li>O cancelamento pode ser pedido a qualquer momento e interrompe as cobranças seguintes.</li>
        <li>O acesso ao plano permanece ativo até o fim do período já pago, indicado em "Histórico e recibos".</li>
        <li>Não há devolução proporcional de períodos já iniciados, salvo falha comprovada do serviço.</li>
      </ul>
    </div>

    <div>
      <h2>3. Falhas no serviço</h2>
      <p>
        Se o Catálogo Premium ficar indisponível por período relevante por causa atribuível à plataforma,
        analisaremos o caso e poderemos conceder extensão do plano ou reembolso proporcional. Indisponibilidades
        de servidores públicos externos (IBGE, INPE e demais órgãos) não geram reembolso, por estarem fora do
        nosso controle.
      </p>
    </div>

    <div>
      <h2>4. Como solicitar</h2>
      <ul>
        <li>Envie o pedido para <a href="mailto:contato@geodatabrasil.com">contato@geodatabrasil.com</a> com o e-mail da conta e o identificador do pagamento (disponível em "Histórico e recibos").</li>
        <li>Responderemos em até 5 dias úteis.</li>
        <li>Reembolsos aprovados são processados pelo mesmo meio de pagamento, respeitando os prazos da operadora ou do emissor do cartão.</li>
      </ul>
    </div>

    <div>
      <h2>5. Plano Gratuito</h2>
      <p>
        O plano Gratuito não gera cobrança e pode ser encerrado a qualquer momento pela exclusão da conta na
        página "Meu perfil".
      </p>
    </div>
  </LegalLayout>
);

export default RefundPolicy;
