import { LegalLayout } from "@/components/LegalLayout";

const CookiePolicy = () => (
  <LegalLayout
    title="Política de Cookies"
    subtitle="Quais cookies e armazenamentos locais o portal utiliza e para quê."
    updatedAt="2 de setembro de 2026"
  >
    <div>
      <h2>1. O que utilizamos</h2>
      <p>
        O GeoData Brasil usa cookies e armazenamento local (localStorage) do navegador apenas para viabilizar o
        funcionamento do serviço. Não utilizamos cookies de publicidade nem de rastreamento entre sites.
      </p>
    </div>

    <div>
      <h2>2. Categorias</h2>
      <ul>
        <li>
          <strong>Essenciais (autenticação):</strong> mantêm sua sessão ativa após o login e identificam seu plano
          de acesso. Sem eles, não é possível acessar o dashboard nem baixar dados.
        </li>
        <li>
          <strong>Preferências:</strong> guardam configurações da sua experiência no mapa, como os serviços WMS
          personalizados adicionados no gerenciador de camadas, visibilidade e opacidade.
        </li>
        <li>
          <strong>Operacionais:</strong> dados temporários usados para desempenho e estabilidade das consultas.
        </li>
      </ul>
    </div>

    <div>
      <h2>3. Cookies de terceiros</h2>
      <p>
        O provedor de pagamentos pode definir cookies próprios durante o processo de checkout, sujeitos às
        políticas dele. Provedores de mapas base podem registrar requisições de tiles para servir as imagens.
      </p>
    </div>

    <div>
      <h2>4. Como gerenciar</h2>
      <p>
        Você pode apagar cookies e o armazenamento local nas configurações do seu navegador. A remoção dos itens
        essenciais encerra a sessão e exige novo login; a remoção das preferências apaga os serviços WMS
        personalizados salvos no seu navegador.
      </p>
    </div>

    <div>
      <h2>5. Contato</h2>
      <p>
        Dúvidas: <a href="mailto:privacidade@geodatabrasil.com">privacidade@geodatabrasil.com</a>.
      </p>
    </div>
  </LegalLayout>
);

export default CookiePolicy;
