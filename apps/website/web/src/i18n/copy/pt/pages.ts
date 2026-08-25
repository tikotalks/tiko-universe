import type { SiteCopyOverride } from '../..'

/**
 * Portuguese page copy (European Portuguese, matching the existing chrome).
 *
 * Translated as prose rather than string-for-string: the English is written to
 * be read, and a literal rendering of it reads like software. Section ids are
 * deliberately absent — they are anchors, not text, and must not be translated.
 */
export const ptPages: NonNullable<SiteCopyOverride['pages']> = {
  whyTiko: {
    documentTitle: 'Porque existe o Tiko',
    description:
      'Porque é que o Tiko é uma família de aplicações pequenas, gratuitas e multilingues em vez de uma grande plataforma de comunicação — e porque nada disto custa dinheiro.',
    eyebrow: 'Porque existe o Tiko',
    title: 'Divertido, simples e em todas as línguas.',
    lede: 'O Tiko é uma família de aplicações pequenas, bonitas e gratuitas que ajudam as crianças a comunicar, a escolher, a seguir rotinas e a compreender o tempo. Cada aplicação abre em segundos, funciona em qualquer língua e nunca pede uma conta — porque o primeiro passo devia ser usar, não configurar.',
    sections: [
      {
        id: 'the-problem',
        eyebrow: 'O problema',
        title: 'As ferramentas de comunicação pedem demasiado antes de ajudarem.',
        body: [
          'Uma criança que ainda não consegue dizer aquilo de que precisa está a ter um dia difícil agora — não depois de um período de testes, de uma licença, de uma formação e de um início de sessão. Ainda assim, a maioria do software de comunicação pede as quatro coisas. Chega como plataforma: uma conta para criar, uma subscrição para justificar, um ecrã de configuração para percorrer e um manual para ler antes de alguém dizer uma palavra.',
          'Esse custo não é só dinheiro. São os vinte minutos que um professor não tem entre aulas, a confiança que um pai perde quando o primeiro ecrã é um formulário, e o equipamento especializado que fica no armário porque ninguém sabe bem como o configurar. A ferramenta acaba a servir a instituição que a comprou, e não a criança que a segura.',
          'O Tiko começa pelo lado oposto. O primeiro ecrã é a ferramenta. Todo o resto — definições, recuperação, sincronização entre dispositivos — vem depois, para o adulto, e só se ele quiser.',
        ],
      },
      {
        id: 'small-apps',
        eyebrow: 'A forma',
        title: 'Muitas aplicações pequenas, não uma grande.',
        lede: 'O Tiko não é um painel de controlo com modos. É um conjunto de aplicações separadas, cada uma a fazer bem uma única coisa.',
        body: [
          'Uma criança que está a aprender a responder a uma pergunta não precisa de um construtor de frases no mesmo ecrã. Uma criança que segue uma rotina da manhã não precisa de um teclado. Cada comando extra é mais uma coisa que se pode ler mal, tocar por engano ou que distrai — e para uma criança que já se esforça para ser compreendida, esse custo é real.',
          'Por isso cada aplicação Tiko é a sua própria aplicação. O Yes No são dois botões. O Type é um campo de texto e um botão para falar. O First mostra um passo de cada vez. Abre-se aquela que corresponde ao momento, e o ecrã não contém quase mais nada.',
        ],
        points: [
          {
            title: 'Um ecrã, uma tarefa',
            body: 'Cada aplicação abre diretamente naquilo que faz. Sem ecrã inicial para navegar, sem modo para escolher primeiro.',
          },
          {
            title: 'Aprende-se uma vez',
            body: 'Como uma aplicação faz uma só coisa, uma criança consegue aprendê-la por completo. A confiança vem de uma ferramenta que se comporta sempre da mesma maneira.',
          },
          {
            title: 'Nada que se torne pequeno demais',
            body: 'Começar pelo Yes No não prende ninguém. As aplicações são separadas: passar ao Talk ou ao Type é abrir outra aplicação, não migrar uma conta.',
          },
          {
            title: 'Pequena o suficiente para merecer confiança',
            body: 'Uma ferramenta que um cuidador percebe num minuto é uma ferramenta a que vai mesmo recorrer num momento difícil.',
          },
        ],
      },
      {
        id: 'language',
        eyebrow: 'Língua',
        title: 'Multilingue desde o início, não traduzida depois.',
        body: [
          'Uma ferramenta de comunicação que só funciona numa língua deixa de fora as crianças que mais precisam dela: a criança de uma casa bilingue, a criança cuja língua familiar não é a da escola, a criança que mudou de país e perdeu as palavras duas vezes.',
          'O Tiko fala a língua da criança, não a de quem o programa. A interface, a voz e os conteúdos são todos traduzíveis, e a língua escolhida por um cuidador acompanha-o em todas as aplicações Tiko e neste site. Onde uma língua ainda não tem tradução de interface, a aplicação recorre ao inglês para essas palavras em vez de se recusar a abrir.',
        ],
      },
      {
        id: 'why-free',
        eyebrow: 'Porquê gratuito',
        title: 'Porque o acesso não devia ter etiqueta de preço.',
        lede: 'As aplicações Tiko são gratuitas, sempre. Não é um teste, não é uma amostra, não é um funil de venda.',
        body: [
          'Comunicar não é uma funcionalidade premium. Uma criança devia poder abrir uma aplicação Tiko agora mesmo, sem que um adulto decida primeiro se este momento em concreto vale o dinheiro — porque essa decisão, tomada sob pressão, costuma ser tomada contra a criança.',
        ],
        points: [
          {
            title: 'Sem hesitação',
            body: 'Experimente uma ferramenta com uma criança já, sem pesar se o momento justifica o custo.',
          },
          {
            title: 'Sem pressão',
            body: 'Sem urgência, sem culpa, sem publicidade, sem convites para melhorar o plano. Nada transforma ser compreendido numa transação.',
          },
          {
            title: 'Sem negócio escondido',
            body: 'Gratuito não quer dizer financiado por publicidade. O Tiko não troca a atenção nem os dados de uma criança por acesso — não há nada para trocar, porque nada é recolhido.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'not-therapy',
        eyebrow: 'O que o Tiko não é',
        title: 'Uma ferramenta, não um tratamento.',
        body: [
          'O Tiko não diagnostica, não trata e não promete resultados. Não é um programa de terapia, nem uma avaliação, nem um substituto de um terapeuta da fala. Não há pontuações, painéis de progresso nem relatórios que comparem uma criança com outra.',
          'O que o Tiko oferece é uma boa ferramenta para um momento concreto: uma forma de responder, de escolher, de dizer uma frase, de seguir uma rotina. Terapeutas e professores usam-no a par do seu próprio trabalho, e as famílias nas horas normais entre consultas. É deliberadamente uma promessa mais modesta do que a da maioria do software desta área.',
        ],
      },
      {
        id: 'professionals',
        eyebrow: 'Quem lhe dá forma',
        title: 'Feito com terapeutas, não apenas para eles.',
        lede: 'Terapeutas da fala, professores e outros profissionais analisam o Tiko e dizem-nos o que está mal.',
        body: [
          'Um programador consegue construir uma ferramenta de comunicação que funciona. Se funciona para uma criança que luta por ser compreendida é outra questão, e não se responde a lendo documentação. Responde-se com as pessoas que estão com essas crianças todas as semanas.',
          'Por isso as aplicações são analisadas por terapeutas da fala, professores de educação especial e outros profissionais — e as suas observações mudam-nas. Algumas são pequenas: um alvo demasiado perto de outro, uma palavra errada num dialeto, uma celebração demasiado estimulante para as crianças com quem trabalham. Outras não: o Say não ter som de erro e nenhuma aplicação Tiko guardar pontuação vieram daí.',
          'Isto não é um aval clínico e o Tiko não o reivindica. É uma revisão de desenho feita por pessoas cujo juízo vale mais do que o nosso nas perguntas que mais importam, e é a razão pela qual várias aplicações são como são e não como começaram.',
        ],
        points: [
          {
            title: 'Analisado numa perspetiva terapêutica',
            body: 'Os profissionais olham para as aplicações a pensar nas crianças que acompanham e dizem com clareza o que atrapalharia.',
          },
          {
            title: 'Observações que mudam o produto',
            body: 'Quando uma revisão diz que um padrão não serve para estas crianças, o padrão muda. Os sons de erro retirados e a ausência de pontuação vieram daí.',
          },
          {
            title: 'Continua a não ser um tratamento',
            body: 'O contributo profissional torna o Tiko melhor desenhado. Não faz dele um programa de terapia, e não o apresentamos como tal.',
          },
        ],
        tone: 'secondary',
      },
      {
        id: 'open-source',
        eyebrow: 'Aberto por omissão',
        title: 'Construído às claras, moldado por quem o usa.',
        body: [
          'O Tiko é de código aberto. O código, os contratos de conteúdo e as formas das API são públicos, por isso um agrupamento de escolas, um terapeuta ou um programador pode ver exatamente o que uma aplicação faz com os dados de uma criança — que na maioria das aplicações Tiko é absolutamente nada.',
          'Também significa que a direção vem de quem o usa. Pais, terapeutas e professores descrevem o que falta com muito mais precisão do que um roteiro escrito em isolamento, e um projeto aberto pode agir sem esperar por uma justificação comercial.',
        ],
      },
    ],
    cta: {
      title: 'Abra uma e veja.',
      body: 'A forma mais rápida de avaliar o Tiko é usá-lo dois minutos com uma criança. Sem conta, sem transferência, sem sala de espera.',
      primaryLabel: 'Ver as aplicações',
      primaryPath: '/apps',
      secondaryLabel: 'Como funciona',
      secondaryPath: '/how-it-works',
    },
  },

  howItWorks: {
    documentTitle: 'Como funciona o Tiko',
    description:
      'Como as aplicações Tiko abrem sem conta, o que acontece no dispositivo e como funciona a recuperação opcional para cuidadores.',
    eyebrow: 'Como funciona o Tiko',
    title: 'Abrir primeiro. A configuração fica em segundo plano.',
    lede: 'O Tiko começa no dispositivo. As aplicações abrem e funcionam de imediato. A recuperação para o cuidador pode vir depois, através de uma ligação mágica por e-mail — nunca antes de a criança poder usar a ferramenta.',
    sections: [
      {
        id: 'first-two-minutes',
        eyebrow: 'A experiência',
        title: 'Três momentos, sem atrito.',
        steps: [
          {
            title: 'Abrir a ligação',
            body: 'Um cuidador partilha uma ligação, guarda-a nos favoritos ou instala a aplicação a partir da App Store. Não há nada para licenciar nem ninguém a quem pedir.',
          },
          {
            title: 'Usar de imediato',
            body: 'A aplicação está pronta: sem início de sessão, sem tutorial e sem percurso de boas-vindas. A criança vê a própria ferramenta, logo à partida.',
          },
          {
            title: 'Recuperar depois, se quiser',
            body: 'Se um cuidador quiser que as definições o acompanhem noutro dispositivo, acrescenta um e-mail e confirma-o uma vez. É opcional, acontece depois, e a criança nunca o vê.',
          },
        ],
      },
      {
        id: 'device-first',
        eyebrow: 'Identidade no dispositivo',
        title: 'Nunca palavras-passe.',
        body: [
          'Cada aplicação Tiko cria uma sessão de dispositivo na primeira vez que abre. É gerada localmente, pertence a esse dispositivo e chega para tudo o que a aplicação faz. Sem e-mail, sem palavra-passe, sem conta.',
          'É esta a parte que a maioria do software de comunicação faz ao contrário. Uma conta existe para que uma empresa o reconheça entre dispositivos — uma necessidade real, mas de adultos, e normalmente é colocada à frente da criança como preço de entrada. O Tiko trata-a como aquilo que é: uma comodidade opcional para o cuidador, oferecida mais tarde.',
        ],
        points: [
          {
            title: 'Sessão de dispositivo',
            body: 'Criada automaticamente na primeira abertura, guardada localmente e nunca exige início de sessão.',
          },
          {
            title: 'Recuperação por ligação mágica',
            body: 'Opcional. Um cuidador acrescenta um e-mail e confirma-o uma vez para ativar a sincronização entre dispositivos.',
          },
          {
            title: 'Sem burocracia para a criança',
            body: 'A recuperação e a administração são só para adultos. A uma criança nunca é mostrado um formulário de conta.',
          },
          {
            title: 'Igual em todas as plataformas',
            body: 'As sessões funcionam da mesma forma na web, no iOS e no Android, por isso uma aplicação comporta-se igual onde quer que corra.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'offline',
        eyebrow: 'Fiabilidade',
        title: 'Continua a funcionar quando a rede não funciona.',
        body: [
          'As aplicações Tiko carregam o conteúdo principal para o dispositivo e funcionam a partir daí. Uma ligação que cai, uma rede escolar que bloqueia metade da internet ou uma viagem de carro sem sinal não tiram a uma criança a possibilidade de responder a uma pergunta.',
          'Tudo o que precisa mesmo de rede — sincronizar definições, transferir um novo conjunto de imagens — é acrescento. Se falhar, a aplicação continua a fazer o que fazia antes.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'O que é recolhido',
        title: 'Quase nada, e nunca da criança.',
        body: [
          'A maioria das aplicações Tiko não recolhe absolutamente nada. Não há análise dos toques de uma criança, identificadores publicitários nem rastreadores de terceiros. O reconhecimento de voz, quando uma aplicação o usa, corre no dispositivo sempre que a plataforma o permite, e as gravações nunca são guardadas nem enviadas.',
          'Quando uma aplicação guarda alguma coisa — cartões criados por um cuidador, uma rotina que construiu, uma frase guardada —, é conteúdo que o adulto criou de propósito, e fica no dispositivo a não ser que ative a sincronização.',
        ],
        points: [
          {
            title: 'Sem publicidade, nunca',
            body: 'Nenhuma aplicação Tiko tem publicidade, redes de anúncios ou rastreio para fins publicitários.',
          },
          {
            title: 'Sem barreira de início de sessão',
            body: 'As aplicações para crianças abrem e funcionam sem conta de qualquer tipo.',
          },
          {
            title: 'No dispositivo sempre que possível',
            body: 'O reconhecimento de voz usa o motor local da plataforma onde existe. As gravações não são guardadas.',
          },
          {
            title: 'Verificável às claras',
            body: 'As aplicações são de código aberto, por isso o que esta página afirma pode ser verificado em vez de aceite por confiança.',
          },
        ],
      },
      {
        id: 'platforms',
        eyebrow: 'Um Tiko, muitos ecrãs',
        title: 'A mesma experiência, em todo o lado.',
        body: [
          'A web é a forma mais rápida de experimentar o Tiko: basta uma ligação. As aplicações nativas acrescentam o que um navegador faz pior — fiabilidade sem ligação, um ícone no ecrã principal que a criança reconhece e melhor suporte de voz.',
          'Use o que usar, a aplicação comporta-se da mesma maneira. Por baixo estão os mesmos contratos, por isso uma rotina construída num tablet é a mesma rotina num telemóvel.',
        ],
      },
    ],
    cta: {
      title: 'Quer o detalhe técnico?',
      body: 'A documentação de arquitetura e de API explica como os workers, o armazenamento e os clientes se encaixam.',
      primaryLabel: 'Documentação de arquitetura',
      primaryPath: '/docs/architecture',
      secondaryLabel: 'Contratos de API',
      secondaryPath: '/docs/apis',
    },
  },
}
