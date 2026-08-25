import type { SiteCopy } from '../..'

/**
 * Documentação para programadores em português.
 *
 * Nomes de serviços, caminhos e exemplos de código não são traduzidos: são
 * endereços, não prosa. Por isso os exemplos de código não estão aqui e
 * recorrem ao inglês, o que é intencional.
 */
export const ptDocs: SiteCopy['docs'] = {
  sidebarLabel: 'Docs',
  navAriaLabel: 'Páginas de documentação',
  articleEyebrow: 'Documentação da plataforma Tiko',
  pages: {
    'docs-overview': {
      label: 'Visão geral',
      title: 'Documentação do Tiko Universe',
      lede: 'A arquitetura, a filosofia de produto e o mapa das API da plataforma Tiko.',
      summary: 'Um ponto de entrada público e legível sobre como o Tiko é construído e porque o sistema tem esta forma.',
      callouts: [
        {
          title: 'Aplicações pequenas, plataforma partilhada',
          body: 'Yes No, Talk, Type, Cards, Sequence, Timer, Radio, Media e futuras aplicações reutilizam os mesmos contratos de identidade, estado, conteúdo, media, geração e interface.',
        },
        {
          title: 'API primeiro, nativo da Cloudflare',
          body: 'Os clientes são deliberadamente leves. A autoridade vive nos Cloudflare Workers com D1, R2, KV como cache e Queues onde o trabalho assíncrono se torna necessário.',
        },
        {
          title: 'Sem burocracia de conta primeiro',
          body: 'Uma ferramenta para crianças tem de abrir e ser útil antes de aparecerem recuperação, sincronização ou administração.',
        },
      ],
      sections: [
        {
          eyebrow: 'O que isto cobre',
          title: 'Um mapa prático para quem constrói',
          body: [
            'Esta documentação explica o Tiko como produto e como plataforma de backend. Não é material de marketing nem um depósito de detalhes de implementação.',
            'A regra importante é simples: se um comportamento afeta os clientes web, iOS ou Android, pertence a um contrato de API documentado antes de se tornar lógica escondida no cliente.',
          ],
          bullets: [
            'Filosofia: princípios de produto centrados na criança e restrições de engenharia.',
            'Arquitetura: aplicações, packages, Workers, propriedade do armazenamento, domínios e fronteiras de implantação.',
            'API: as famílias de contratos atuais e as formas estáveis que os clientes podem esperar.',
          ],
        },
        {
          eyebrow: 'Forma atual da plataforma',
          title: 'Um repositório, responsabilidades claras',
          body: [
            'O Tiko Universe é um monorepo com npm workspaces: aplicações por produto, packages TypeScript partilhados e serviços Cloudflare Worker. O código nativo de iOS vive junto ao produto onde existe; o Android segue os mesmos contratos de API em vez de copiar lógica de backend para o cliente.',
          ],
          bullets: [
            'Aplicações: ferramentas para crianças e superfícies públicas ou de administração que as acompanham.',
            'Packages: clientes tipados, contratos partilhados, Tiko UI, i18n, media, identidade e utilitários de teste.',
            'Workers: identidade, estado das aplicações, conteúdo, media, geração, administração e compatibilidade temporária de TTS.',
          ],
        },
      ],
    },
    'docs-philosophy': {
      label: 'Filosofia',
      title: 'Filosofia de produto e de engenharia',
      lede: 'O Tiko é software que pensa primeiro na criança. O backend existe para manter o momento da criança imediato, calmo e recuperável, sem se tornar software empresarial.',
      summary: 'Os princípios inegociáveis por trás de cada decisão de arquitetura.',
      callouts: [
        { title: 'Imediato', body: 'As aplicações abrem e funcionam de imediato. O primeiro ecrã nunca é um formulário de início de sessão.' },
        { title: 'Pequeno', body: 'Cada aplicação faz uma coisa clara em vez de se tornar um painel de controlo.' },
        { title: 'Recuperável', body: 'As sessões no dispositivo podem tornar-se recuperáveis depois, através de uma ligação mágica por e-mail.' },
      ],
      sections: [
        {
          eyebrow: 'Doutrina',
          title: 'O que é inegociável',
          body: [
            'A doutrina é propositadamente rígida, porque «só desta vez uma exceção» dá, seis meses depois, uma plataforma que ninguém percebe. O Tiko evita isso mantendo identidade, API e propriedade do armazenamento aborrecidas e explícitas.',
          ],
          bullets: [
            'Sem palavras-passe e sem barreiras de início de sessão antes de usar.',
            'Sem runtime Supabase, sem ponte para utilizadores antigos, sem obrigação de migração e sem pressupor Better Auth.',
            'Identidade no dispositivo por omissão; recuperação opcional por e-mail através de ligações mágicas.',
            'O D1 é a fonte relacional de verdade. O R2 é a fonte de verdade dos bytes. O KV é apenas cache.',
            'O Lezu gere as traduções; o Tiko consome pacotes e alternativas versionadas.',
            'Web, iOS e Android são clientes iguais das mesmas API HTTPS JSON.',
          ],
        },
        {
          eyebrow: 'Modelo de produto',
          title: 'Porquê aplicações pequenas',
          body: [
            'O Tiko não é uma grande «plataforma para necessidades especiais» com um labirinto de funcionalidades. É um universo de ferramentas pequenas e focadas que se abrem no momento em que uma criança ou um cuidador precisa de uma coisa.',
            'Ferramentas separadas reduzem a carga cognitiva, mantêm as áreas de toque evidentes e facilitam testar se uma ferramenta ajuda antes de pedir a um cuidador que confie em sincronização, recuperação ou administração.',
          ],
          bullets: [
            'Yes No: respostas rápidas com duas escolhas.',
            'Type: escrita de texto e leitura em voz alta.',
            'Cards: escolhas visuais e conteúdo familiar.',
            'Sequence: rotinas ordenadas e passos seguintes.',
            'Timer: tornar o tempo visível e acompanhar transições.',
          ],
        },
        {
          eyebrow: 'Modelo de engenharia',
          title: 'Contratos antes dos clientes',
          body: [
            'O código do cliente pode ser agradável e resistente. O que não pode é tornar-se em segredo o backend. Se um comportamento tem autoridade, persistência, segredos de fornecedor ou efeitos entre dispositivos, pertence a um Worker e a um contrato documentado.',
          ],
          bullets: [
            'Os packages expõem clientes tipados, modelos, fixtures e composição de interface.',
            'Os Workers são donos da autenticação, dos limites de taxa, do acesso a D1/R2/KV/Queues, das chamadas a fornecedores e das mutações duradouras.',
            'As aplicações podem manter estado local de recurso para que o percurso da criança continue utilizável quando uma chamada de rede falha.',
          ],
        },
      ],
    },
    'docs-architecture': {
      label: 'Arquitetura',
      title: 'Arquitetura',
      lede: 'O Tiko é uma plataforma nativa da Cloudflare: aplicações por produto, packages de cliente partilhados, Workers como serviços de domínio, D1/R2 para estado duradouro e KV apenas como cache.',
      summary: 'Como o monorepo, os domínios, o armazenamento, os workers e os clientes se encaixam.',
      callouts: [
        { title: 'Clientes', body: 'As aplicações web em Vue, as aplicações iOS em SwiftUI e os futuros clientes Android consomem os mesmos contratos de API.' },
        { title: 'Serviços', body: 'Os Workers são divididos por fronteira de domínio, não pelo ficheiro que existiu primeiro.' },
        { title: 'Armazenamento', body: 'O D1 é dono da verdade relacional. O R2 é dono dos bytes. O KV é cache reconstruível.' },
      ],
      sections: [
        {
          eyebrow: 'Mapa do sistema',
          title: 'O fluxo geral',
          body: [
            'A arquitetura é propositadamente simples. Os clientes falam por API HTTPS JSON. Os Workers validam a identidade e são donos das mutações. O armazenamento está ligado ao Worker que é dono do domínio.',
          ],
        },
        {
          eyebrow: 'Repositório',
          title: 'Monorepo com o produto primeiro',
          body: [
            'O repositório está organizado primeiro por produtos e depois por packages de plataforma e Workers. Assim o contexto de uma aplicação para crianças fica perto das suas implementações web e nativa, partilhando contratos através dos packages.',
          ],
          bullets: [
            '`apps/<product>/web` contém aplicações Vue implantadas no Cloudflare Pages.',
            '`apps/<product>/ios` contém clientes SwiftUI onde existe trabalho nativo.',
            '`packages/*` contém contratos TypeScript partilhados, clientes, Tiko UI, i18n, media, identidade e utilitários de teste.',
            '`workers/*` contém serviços Cloudflare Worker com os seus próprios bindings D1/R2 e testes.',
          ],
        },
        {
          eyebrow: 'Fronteiras de serviço',
          title: 'Responsabilidade de cada Worker',
          body: [
            'Cada Worker tem uma tarefa estreita. Isso torna a autorização, as migrações, a limitação de taxa e o risco de implantação mais fáceis de raciocinar.',
          ],
          bullets: [
            '`identity-api`: sujeitos Ankore, dispositivos, sessões, contas e desafios por e-mail.',
            '`app-api`: definições e estado de aplicação por utilizador.',
            '`content-api`: conteúdo publicado, registos do tipo CMS e modelos de leitura em cache.',
            '`media-api`: autorização de envio, metadados de media, propriedade e acesso ao R2.',
            '`generation-api`: TTS, geração de frases e imagens, metadados de media gerada e futuras queues.',
            '`admin-api`: operações perigosas apenas de administração, relatórios, moderação e ferramentas de apoio.',
            '`tts-api`: superfície de compatibilidade temporária que deve passar para generation-api.',
          ],
        },
        {
          eyebrow: 'Domínios',
          title: 'Rotas públicas',
          body: [
            'Os domínios fazem parte da arquitetura. Nomes de anfitrião novos ao acaso são exatamente como as plataformas se transformam em arqueologia.',
          ],
          bullets: [
            '`tiko.mt`: página pública de produto e marketing.',
            '`tikotalks.com`: a superfície pública do TikoTalks para documentação e marca — ou seja, estas páginas.',
            '`*.tikoapps.org`: a família de aplicações em funcionamento, como yesno, type, cards, sequence, timer, media e admin.',
            '`id.tiko.mt`: origem de identidade baseada no dispositivo (alias antigo de `identity.tikoapi.org`).',
            '`*.tikoapi.org`: a família de serviços de API — `identity`, `admin`, `app`, `communication`, `content`, `generation`, `media` e `translations` têm cada um o seu subdomínio.',
            '`*.tikocdn.org`: apenas entrega de bytes, sem lógica de aplicação.',
          ],
        },
      ],
    },
    'docs-apis': {
      label: 'API',
      title: 'Contratos de API',
      lede: 'As API são a espinha dorsal do produto. Permitem que os clientes web, iOS e Android se comportem da mesma forma sem copiar lógica de backend para cada aplicação.',
      summary: 'Um guia legível das famílias de contratos `/v1` atuais.',
      callouts: [
        { title: 'Versionado', body: 'As API visíveis para clientes vivem sob `/v1` e devolvem JSON, exceto os endpoints que transmitem bytes.' },
        { title: 'Erros tipados', body: 'Os erros usam códigos estáveis legíveis por máquina e mensagens seguras para pessoas.' },
        { title: 'Compatível com bearer', body: 'Os clientes nativos têm de funcionar com sessões bearer explícitas; cookies de navegador não chegam.' },
      ],
      sections: [
        {
          eyebrow: 'Regras comuns de API',
          title: 'Regras de contrato',
          body: [
            'A forma da API deve manter-se aborrecida. É um elogio. Rotas previsíveis e envelopes de erro consistentes impedem vários clientes de divergirem.',
          ],
          bullets: [
            'Usar caminhos `/v1`.',
            'Devolver JSON das rotas de API; transmitir bytes apenas a partir de rotas explícitas de media ou áudio.',
            'Usar sessões bearer para paridade nativa.',
            'Nunca revelar se um e-mail de recuperação ou um identificador existe.',
            'Guardar tokens em bruto apenas do lado do cliente; o servidor guarda hashes.',
            'Não expor aos clientes os corpos de erro dos fornecedores.',
          ],
        },
        {
          eyebrow: 'Identidade',
          title: 'API de identidade baseada no dispositivo',
          body: [
            'A identidade existe para que as aplicações abram de imediato e possam mesmo assim tornar-se recuperáveis depois. O bootstrap cria ou restaura uma sessão de dispositivo; a recuperação por e-mail melhora a continuidade sem transformar o arranque num início de sessão.',
          ],
          bullets: [
            '`POST /v1/identity/device` — criar ou restaurar uma sessão baseada no dispositivo.',
            '`GET /v1/identity/session` — validar e devolver o pacote de sessão atual.',
            '`POST /v1/identity/email/challenge` — pedir um desafio de recuperação por e-mail, com resposta genérica.',
            '`POST /v1/identity/email/verify` — verificar um token de ligação mágica ou OTP e devolver um pacote de identidade Ankore.',
            '`POST /v1/identity/logout` — revogar a sessão bearer atual.',
          ],
        },
        {
          eyebrow: 'Dados de aplicação',
          title: 'API de definições e estado',
          body: [
            'A API de aplicação é dona das definições e do estado por utilizador das pequenas aplicações Tiko. As definições são preferências visíveis para o cuidador. O estado são os dados próprios da aplicação que vale a pena preservar entre dispositivos quando a persistência é intencional.',
          ],
          bullets: [
            '`GET /v1/apps/{app}/settings` — ler as definições.',
            '`PUT /v1/apps/{app}/settings` — guardar as definições com suporte de versões.',
            '`GET /v1/apps/{app}/state` — ler o estado da aplicação.',
            '`PUT /v1/apps/{app}/state` — guardar o estado da aplicação.',
            'Nomes de aplicação P0 permitidos: `yes-no`, `type`, `cards`, `sequence`, `timer`.',
          ],
        },
        {
          eyebrow: 'Geração e media',
          title: 'TTS, áudio gerado, envios e registos de media',
          body: [
            'Geração e media estão relacionadas, mas não são a mesma coisa. A geração cria recursos. A media gere recursos enviados e os seus metadados. O R2 guarda os bytes; o D1 guarda a propriedade e os metadados de pesquisa.',
          ],
          bullets: [
            '`POST /v1/generation/tts` — gerar ou obter em cache áudio de texto para voz.',
            '`GET /v1/generation/audio/{id}` — transmitir os bytes de áudio gerado.',
            '`POST /v1/media/uploads` — autorizar e registar um envio de media.',
            '`GET /v1/media/{id}` — ler metadados ou detalhes de acesso de media.',
            '`DELETE /v1/media/{id}` — futuro contrato de eliminação quando a experiência de produto existir.',
          ],
        },
        {
          eyebrow: 'Conteúdo e administração',
          title: 'Conteúdo publicado e operações perigosas',
          body: [
            'O conteúdo trata de modelos de leitura publicados, conteúdo de aplicações e registos do tipo CMS. A administração está deliberadamente separada, porque operações perigosas nunca devem ser contrabandeadas para API usadas por crianças.',
          ],
          bullets: [
            'A `content-api` é dona do conteúdo publicado, da visibilidade das aplicações, das versões de conteúdo e dos modelos de leitura em cache.',
            'A `admin-api` é dona da configuração de back-office, dos relatórios, da moderação, das ações de apoio e dos registos de auditoria.',
            'Chaves ou sessões da API de administração não pertencem a percursos usados por crianças.',
          ],
        },
      ],
    },
  },
}
