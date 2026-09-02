import { LegalLayout } from "@/components/LegalLayout";

const DataLicense = () => (
  <LegalLayout
    title="Licença e Uso dos Dados"
    subtitle="Origem, créditos e condições de uso das camadas disponibilizadas no portal."
    updatedAt="2 de setembro de 2026"
  >
    <div>
      <h2>1. Dados públicos oficiais</h2>
      <p>
        As camadas provenientes de fontes públicas são acessadas diretamente dos serviços WMS/WFS mantidos pelos
        órgãos de origem — entre eles IBGE, INPE, ICMBio, MMA, ANP, CPRM, EMBRAPA, MAPA, SFB, DNIT, ANATEL e IPHAN.
        A titularidade, a exatidão e a atualização desses dados são de responsabilidade exclusiva dos órgãos
        produtores. O acesso é oferecido em conformidade com a Lei de Acesso à Informação (Lei nº 12.527/2011).
      </p>
    </div>

    <div>
      <h2>2. Créditos obrigatórios</h2>
      <p>
        Ao reutilizar dados públicos obtidos pelo portal em mapas, relatórios ou publicações, cite o órgão de
        origem da camada e, quando aplicável, a licença por ele definida. O GeoData Brasil atua apenas como meio
        de acesso e conversão de formatos.
      </p>
    </div>

    <div>
      <h2>3. Catálogo Premium</h2>
      <ul>
        <li>As camadas do Catálogo Premium são produzidas, tratadas e hospedadas pela plataforma.</li>
        <li>
          Assinantes recebem uma licença de uso <strong>não exclusiva, intransferível e revogável</strong>, para uso
          interno em projetos próprios ou de seus clientes.
        </li>
        <li>
          É vedada a redistribuição, revenda, publicação em repositórios abertos ou disponibilização das camadas
          como produto autônomo a terceiros.
        </li>
        <li>A licença permanece válida enquanto a assinatura estiver ativa para os arquivos já baixados no período.</li>
      </ul>
    </div>

    <div>
      <h2>4. Formatos e conversões</h2>
      <p>
        As conversões para GeoJSON, KML e Shapefile são feitas pelo servidor a partir dos dados de origem.
        Podem ocorrer simplificações, reprojeções ou truncamento de nomes de atributos inerentes a cada formato —
        verifique a adequação do arquivo antes de usá-lo em análises críticas.
      </p>
    </div>

    <div>
      <h2>5. Isenção de garantias</h2>
      <p>
        Os dados são fornecidos "no estado em que se encontram", sem garantia de precisão posicional, completude ou
        adequação a finalidade específica. Não substituem levantamentos oficiais, documentos cartoriais,
        licenciamento ambiental ou laudos técnicos.
      </p>
    </div>

    <div>
      <h2>6. Correções e remoções</h2>
      <p>
        Encontrou inconsistência em uma camada ou é titular de dados publicados indevidamente? Escreva para
        <a href="mailto:contato@geodatabrasil.com"> contato@geodatabrasil.com</a> e avaliaremos a correção ou a
        remoção do conteúdo.
      </p>
    </div>
  </LegalLayout>
);

export default DataLicense;
