import type { SiteCopyOverride } from '../..'

type Pages = NonNullable<SiteCopyOverride['pages']>

/** Portuguese copy for the audience-facing and help pages. */
export const ptAudiencePages: Pick<Pages, 'caregivers' | 'educators' | 'faq' | 'support'> = {
  caregivers: {
    documentTitle: 'Para cuidadores',
    description:
      'O que o Tiko promete a pais e cuidadores: nenhuma conta antes de usar, sem publicidade, sem rastreio, e ferramentas que se experimentam num momento difícil sem preparar nada.',
    eyebrow: 'Para cuidadores',
    title: 'Feito para que o primeiro momento não seja um formulário.',
    lede: 'Devia poder experimentar uma ferramenta antes de confiar nela. O Tiko foi pensado para que um cuidador abra uma aplicação, veja se ajuda e só acrescente recuperação ou sincronização quando isso importar mesmo.',
    sections: [
      {
        id: 'non-negotiables',
        eyebrow: 'Princípios de confiança',
        title: 'Aquilo que não se negoceia.',
        lede: 'São compromissos, não definições atuais. Não mudam quando as circunstâncias mudam.',
        points: [
          {
            title: 'Gratuito, sempre',
            body: 'Nunca vendemos os seus dados nem a atenção de uma criança em troca de acesso. As aplicações são gratuitas porque cobrar pela comunicação é a troca errada.',
          },
          {
            title: 'Sem publicidade. Nunca.',
            body: 'Nenhuma aplicação Tiko tem publicidade, rastreio para publicidade ou redes de anúncios de terceiros.',
          },
          {
            title: 'Sem barreiras de início de sessão',
            body: 'As aplicações para crianças abrem e funcionam sem conta. Nada se interpõe entre uma criança e o ser compreendida.',
          },
          {
            title: 'O mínimo possível',
            body: 'Só recolhemos aquilo de que uma aplicação precisa mesmo para funcionar, e a maioria das aplicações Tiko não precisa de nada.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'starting',
        eyebrow: 'Como começar',
        title: 'Não precisa de se preparar.',
        body: [
          'Não há uma forma certa de começar nem nada para configurar primeiro. Abra a aplicação que corresponde ao momento em que está mesmo — uma pergunta para responder, uma rotina para atravessar, uma palavra para praticar — e use-a. Se não ajudar, feche-a. Não se gastou nada nem se subscreveu nada.',
          'A maioria dos cuidadores encontra uma aplicação que serve e fica com ela durante muito tempo. Isso é um bom resultado, não uma limitação. O Tiko não quer tornar-se o sítio onde a sua criança passa o dia.',
        ],
        steps: [
          {
            title: 'Comece pelo momento, não pela aplicação',
            body: 'Escolha a aplicação que corresponde a algo que acontece hoje. Yes No para uma pergunta, First para uma rotina, Type para uma mensagem que precisa de ser dita.',
          },
          {
            title: 'Use-a ao lado da criança',
            body: 'Estas são ferramentas para duas pessoas. Sentar-se ao lado e mostrar um toque ou uma frase vale mais do que entregar o dispositivo.',
          },
          {
            title: 'Torne-a dela',
            body: 'Ponha as suas fotografias, as suas palavras, a sua rotina. Uma fotografia dos sapatos verdadeiros da criança vale mais do que um ícone de sapatos.',
          },
          {
            title: 'Acrescente recuperação só se quiser',
            body: 'Se as definições devem acompanhá-lo noutro dispositivo, acrescente um e-mail uma vez. Se não, salte esse passo: nada mais muda.',
          },
        ],
      },
      {
        id: 'expectations',
        eyebrow: 'Com franqueza',
        title: 'O que o Tiko faz e o que não faz.',
        body: [
          'O Tiko não diagnostica, não trata e não promete resultados. Não lhe dirá se a sua criança está a progredir, e deliberadamente não guarda pontuações que sugiram que poderia. Se quer uma avaliação, esse é o trabalho de um terapeuta da fala — e um bom terapeuta vale muito mais do que qualquer aplicação.',
          'O que o Tiko pode fazer é tirar atrito a momentos concretos: ser-lhe feita uma pergunta e ter forma de responder, saber o que vem a seguir numa rotina, conseguir dizer uma frase que de outro modo ficaria presa. Esses momentos contam, e chegam bem como tarefa para uma ferramenta.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Privacidade',
        title: 'O que acontece aos dados da sua criança.',
        body: [
          'Na maioria das aplicações Tiko, nada sai do dispositivo. Os cartões que cria, as rotinas que constrói e as frases que guarda ficam localmente. Não há análise do que uma criança toca nem identificadores publicitários.',
          'Se ativar a sincronização, o conteúdo que criou é guardado para chegar aos seus outros dispositivos. É conteúdo que um adulto criou de propósito — nunca um registo de como uma criança usou a aplicação. Pode ler exatamente o que é guardado na política de privacidade e, como o Tiko é de código aberto, também pode conferir o código em vez de acreditar em nós.',
        ],
      },
    ],
    cta: {
      title: 'Experimente hoje com a sua criança.',
      body: 'Abra uma aplicação e use-a durante dois minutos. Isso diz-lhe mais do que qualquer descrição nesta página.',
      primaryLabel: 'Ver as aplicações',
      primaryPath: '/apps',
      secondaryLabel: 'Ler a política de privacidade',
      secondaryPath: '/privacy-policy',
    },
  },

  educators: {
    documentTitle: 'Para professores e terapeutas',
    description:
      'Usar o Tiko numa turma ou numa lista de casos: perfis separados por criança, sem licença por lugar, nada para instalar e nenhuns dados a sair do dispositivo.',
    eyebrow: 'Para professores e terapeutas',
    title: 'Acompanhe muitas crianças. Mantenha cada experiência calma.',
    lede: 'O Gestor de Perfis do Tiko permite a um professor ou terapeuta criar um perfil leve e separado para cada criança — e decidir exatamente ao que cada uma chega. As crianças ficam com uma ferramenta simples e focada. Os adultos mantêm os controlos fora de vista.',
    sections: [
      {
        id: 'why-it-fits',
        eyebrow: 'Na sala de aula',
        title: 'Feito para os vinte minutos que realmente tem.',
        body: [
          'O software que chega a uma escola costuma assumir que alguém tem tempo para o configurar. Na prática, quem segura o tablet tem os poucos minutos entre uma aula e a seguinte, e uma criança que precisa de uma resposta agora.',
          'O Tiko foi feito para essa realidade. Num dispositivo gerido não há nada para instalar além de abrir uma ligação, nenhuma chave de licença para perseguir nas compras e nenhum dia de formação antes de a ferramenta servir. Se não encaixar no seu contexto, perdeu uns minutos em vez de uma rubrica do orçamento.',
        ],
        points: [
          {
            title: 'Sem licença por lugar',
            body: 'Gratuito para cada criança da sua turma ou lista de casos. Não há número de utilizadores a reportar nem renovação a justificar.',
          },
          {
            title: 'Nada para instalar',
            body: 'As aplicações web abrem a partir de uma ligação num dispositivo gerido. As nativas são uma instalação normal da App Store.',
          },
          {
            title: 'Sem contas de criança',
            body: 'As crianças nunca criam credenciais nem lidam com palavras-passe, o que deixa a ferramenta fora da maioria das revisões de proteção de menores.',
          },
          {
            title: 'Funciona na rede que tem',
            body: 'As aplicações funcionam sem ligação após a primeira utilização, por isso uma rede escolar filtrada ou instável não interrompe uma sessão.',
          },
        ],
      },
      {
        id: 'profiles',
        eyebrow: 'Muitas crianças',
        title: 'Um perfil separado para cada criança.',
        body: [
          'Uma lista de casos não é um utilizador. Cada criança precisa do seu vocabulário, das suas rotinas e das suas imagens — e nenhuma delas devia ver as de outra.',
          'O Gestor de Perfis mantém isso separado no mesmo dispositivo. Muda de perfil como adulto, e cada criança vê apenas o seu conteúdo ao abrir uma aplicação. Os controlos de adulto ficam atrás dos mesmos percursos reservados usados em todo o Tiko, por isso uma criança curiosa não vai parar às definições.',
        ],
        points: [
          {
            title: 'Conteúdo por criança',
            body: 'Cartões, rotinas e frases guardadas pertencem a um perfil, não ao dispositivo.',
          },
          {
            title: 'Mudança só por adultos',
            body: 'Mudar de perfil é uma ação de adulto. As crianças ficam na aplicação que lhes foi dada.',
          },
          {
            title: 'Pensado para dispositivos partilhados',
            body: 'Feito para o tablet que passa de criança em criança ao longo do dia, que é como a maioria dos contextos funciona de facto.',
          },
          {
            title: 'Sem visibilidade cruzada',
            body: 'O vocabulário e o histórico de uma criança nunca são visíveis a partir de outro perfil.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'alongside-practice',
        eyebrow: 'A par da sua prática',
        title: 'Uma ferramenta nas suas mãos, não um programa a seguir.',
        body: [
          'O Tiko não traz currículo, nem sequência prescrita, nem opinião sobre como uma sessão deve correr. Não pontua uma criança, não a compara com uma norma nem produz relatórios. Esses juízos são seus, e a evidência para eles vem da sua observação, não da telemetria de uma aplicação.',
          'O que o Tiko lhe dá é um conjunto de ferramentas fiáveis e sem atrito a que recorrer durante o trabalho que já faz: oferecer uma escolha binária, construir uma frase, manter a atenção num passo ou praticar uma palavra sem que um som de erro castigue a falha.',
        ],
      },
      {
        id: 'data',
        eyebrow: 'Dados e proteção de menores',
        title: 'Versão curta: fica no dispositivo.',
        body: [
          'A maioria das aplicações Tiko não envia nada para lado nenhum. Não há análise das interações das crianças, publicidade nem rastreadores de terceiros. O reconhecimento de voz, onde é usado, corre no dispositivo sempre que a plataforma o permite, e as gravações nunca são guardadas.',
          'Como as aplicações são de código aberto, o seu responsável de informática ou de proteção de menores pode verificá-lo em vez de confiar numa garantia num folheto. Se o seu contexto precisar do detalhe por escrito, a política de privacidade e a documentação de arquitetura são ambas públicas.',
        ],
      },
    ],
    cta: {
      title: 'Experimente primeiro com uma criança.',
      body: 'Escolha uma aplicação e uma criança esta semana. É um teste mais justo do que qualquer grelha de avaliação, e não custa nada.',
      primaryLabel: 'Ver as aplicações',
      primaryPath: '/apps',
      secondaryLabel: 'Princípios de confiança',
      secondaryPath: '/caregivers',
    },
  },

  faq: {
    documentTitle: 'Perguntas frequentes',
    description:
      'Respostas claras sobre o que é o Tiko, quanto custa, o que recolhe e o que deliberadamente não afirma fazer.',
    eyebrow: 'Perguntas frequentes',
    title: 'Respostas claras antes de configurar seja o que for.',
    lede: 'Respostas curtas às perguntas que cuidadores, professores e programadores fazem mais vezes. Se a sua não estiver aqui, uma pessoa a sério está a um e-mail de distância.',
    sections: [
      {
        id: 'basics',
        eyebrow: 'O básico',
        title: 'O que é o Tiko.',
        questions: [
          {
            question: 'O que é o Tiko?',
            answer:
              'O Tiko é uma coleção de aplicações pequenas e gratuitas que ajudam as crianças a comunicar, a escolher, a seguir rotinas e a compreender o tempo. Cada aplicação faz uma coisa clara e abre de imediato — em qualquer língua, em qualquer dispositivo, sem conta.',
          },
          {
            question: 'Porquê muitas aplicações em vez de uma?',
            answer:
              'Porque cada comando extra no ecrã é mais uma coisa que uma criança pode ler mal ou tocar por engano. Uma aplicação que faz uma só coisa pode ser aprendida por completo, e uma criança que a aprendeu pode confiar nela. O Yes No são dois botões; nunca lhe devia crescer um construtor de frases.',
          },
          {
            question: 'Para quem é o Tiko?',
            answer:
              'Para crianças que precisam de apoio para se exprimirem — por uma dificuldade de fala ou linguagem, um atraso de desenvolvimento, uma deficiência ou simplesmente por estarem no início da fala — e para os pais, professores e terapeutas ao seu lado. Nada disto exige um diagnóstico.',
          },
          {
            question: 'Que aplicações existem hoje?',
            answer:
              'Yes No, Type, Talk, Say, Sum e First estão disponíveis, na web ou na App Store conforme a aplicação. Cards, Sequence e Timer ainda estão a ser feitas. A página das aplicações mostra exatamente onde cada uma pode ser aberta.',
          },
        ],
      },
      {
        id: 'cost',
        eyebrow: 'Custo',
        title: 'Quanto custa e porquê.',
        questions: [
          {
            question: 'O Tiko é mesmo gratuito?',
            answer:
              'Sim. As aplicações Tiko são gratuitas, sempre. Não é uma pré-visualização temporária, nem uma amostra, nem um funil de venda. Não há um plano pago a reter uma funcionalidade de que uma criança precisa.',
          },
          {
            question: 'O Tiko vai mostrar publicidade?',
            answer:
              'Não. Sem publicidade, nunca. O Tiko deve poder abrir-se ao lado de uma criança sem conteúdo comercial, mensagens patrocinadas ou seja o que for desenhado para captar atenção.',
          },
          {
            question: 'Se é gratuito e sem publicidade, como é financiado?',
            answer:
              'O Tiko é feito como projeto de código aberto e não como uma empresa com metas de crescimento. Isso mantém os custos baixos — as aplicações são minúsculas e a maioria não fala com servidor nenhum.',
          },
          {
            question: 'Os dados da minha criança são o pagamento?',
            answer:
              'Não. Aqui gratuito não quer dizer financiado por publicidade. A maioria das aplicações Tiko não recolhe nada, por isso não haveria nada para vender mesmo que quiséssemos.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'accounts',
        eyebrow: 'Contas e privacidade',
        title: 'O que é preciso ceder para usar.',
        questions: [
          {
            question: 'Preciso de uma conta?',
            answer:
              'Não. As aplicações Tiko abrem e funcionam sem barreira de início de sessão. A recuperação opcional para o cuidador fica disponível mais tarde através de uma ligação mágica por e-mail, mas a aplicação da criança nunca começa por criar uma conta.',
          },
          {
            question: 'Que dados é que o Tiko recolhe?',
            answer:
              'Na maioria das aplicações, nenhuns. Não há análise do que uma criança toca, identificadores publicitários ou rastreadores de terceiros. O que cria — cartões, rotinas, frases guardadas — fica no dispositivo a não ser que ative a sincronização.',
          },
          {
            question: 'O Tiko grava a voz da minha criança?',
            answer:
              'Onde uma aplicação escuta, o reconhecimento de voz corre no dispositivo sempre que a plataforma o permite, e as gravações nunca são guardadas nem enviadas. As aplicações que não precisam de microfone nunca o pedem.',
          },
          {
            question: 'Posso verificar alguma coisa disto?',
            answer:
              'Pode, e deve. O Tiko é de código aberto, por isso o código por trás destas afirmações é público. A política de privacidade explica em linguagem clara o que é guardado.',
          },
        ],
      },
      {
        id: 'scope',
        eyebrow: 'O que o Tiko não é',
        title: 'Os limites, ditos com clareza.',
        questions: [
          {
            question: 'O Tiko é um produto terapêutico ou médico?',
            answer:
              'Não. O Tiko não diagnostica, não trata e não promete resultados. É um conjunto de ferramentas de comunicação e aprendizagem, não uma intervenção clínica, e não substitui um terapeuta da fala.',
          },
          {
            question: 'O Tiko acompanha o progresso?',
            answer:
              'Não, deliberadamente. Não há pontuações, sequências nem painéis. O progresso na comunicação não é algo que uma aplicação deva avaliar, e um número no ecrã tende a moldar mais o comportamento do adulto do que o da criança.',
          },
          {
            question: 'Vai funcionar com a minha criança?',
            answer:
              'Sinceramente não sabemos, e quem disser o contrário está a adivinhar. As aplicações são gratuitas e abrem de imediato, por isso a forma mais barata de descobrir é experimentar uma durante alguns minutos.',
          },
        ],
      },
      {
        id: 'practical',
        eyebrow: 'Prático',
        title: 'Dispositivos, línguas e uso sem ligação.',
        questions: [
          {
            question: 'Que línguas é que o Tiko fala?',
            answer:
              'As aplicações são multilingues desde a base, e a língua escolhida por um cuidador acompanha-o em todas as aplicações Tiko e neste site. Onde uma língua ainda não tem tradução de interface, a aplicação recorre ao inglês em vez de se recusar a abrir.',
          },
          {
            question: 'Funciona sem ligação?',
            answer:
              'Sim. As aplicações carregam o conteúdo principal para o dispositivo e continuam a funcionar sem rede. Tudo o que precisa de internet é acrescento, e não conseguir alcançá-lo não pára a aplicação.',
          },
          {
            question: 'Em que dispositivos funciona?',
            answer:
              'Em qualquer navegador moderno, mais aplicações nativas para iPhone e iPad no caso das que já saíram na App Store. O Android segue a mesma abordagem.',
          },
          {
            question: 'Posso usar numa turma ou lista de casos?',
            answer:
              'Sim. O Gestor de Perfis mantém um perfil separado por criança num dispositivo partilhado, e não há licença por lugar para comprar ou reportar.',
          },
        ],
      },
    ],
    cta: {
      title: 'Ainda tem uma pergunta?',
      body: 'O apoio é uma pessoa, não uma fila de tickets. Pergunte e terá uma resposta direta.',
      primaryLabel: 'Obter apoio',
      primaryPath: '/support',
      secondaryLabel: 'Porque existe o Tiko',
      secondaryPath: '/why-tiko',
    },
  },

  support: {
    documentTitle: 'Apoio',
    description:
      'Ajuda com as aplicações Tiko para crianças, cuidadores e professores — temas comuns, resolução de problemas e como falar com uma pessoa.',
    eyebrow: 'Apoio',
    title: 'Estamos aqui para ajudar.',
    lede: 'Ajuda com as aplicações Tiko para crianças, cuidadores e professores. A maioria das respostas está abaixo — e uma pessoa a sério está a um e-mail de distância.',
    sections: [
      {
        id: 'common',
        eyebrow: 'Temas comuns',
        title: 'Respostas rápidas para começar.',
        points: [
          {
            title: 'Primeiros passos',
            body: 'Todas as aplicações Tiko abrem de imediato — sem conta nem palavra-passe. Abra a ligação ou instale a aplicação e comece a usar.',
          },
          {
            title: 'Contas e dispositivos',
            body: 'O Tiko usa sessões de dispositivo em vez de palavras-passe. Se mudar ou repuser um dispositivo, acrescente antes um e-mail de recuperação para o conteúdo o acompanhar.',
          },
          {
            title: 'Vozes e línguas',
            body: 'Escolha uma voz e uma língua que encaixem com a criança. As aplicações Tiko suportam muitas línguas e mudam de imediato a partir das definições.',
          },
          {
            title: 'Uso sem ligação',
            body: 'As aplicações continuam a funcionar sem rede depois da primeira utilização. A sincronização retoma sozinha quando a ligação volta.',
          },
          {
            title: 'Privacidade e dados',
            body: 'A maioria das aplicações não guarda nada fora do dispositivo. O que cria fica local a não ser que ative a sincronização de propósito.',
          },
          {
            title: 'Alguma coisa não funciona?',
            body: 'Diga-nos o que viu, em que dispositivo e em que aplicação. Normalmente é quanto basta para encontrarmos.',
          },
        ],
      },
      {
        id: 'troubleshooting',
        eyebrow: 'Resolução de problemas',
        title: 'As três coisas que resolvem quase tudo.',
        steps: [
          {
            title: 'Recarregue a aplicação',
            body: 'Feche-a por completo e volte a abri-la. As aplicações web atualizam-se em segundo plano, e recarregar apanha a versão mais recente.',
          },
          {
            title: 'Confirme a língua e a voz',
            body: 'Se a voz soar errada ou ficar em silêncio, a voz escolhida pode não estar instalada no dispositivo. Experimente outra nas definições — no iOS, as vozes extra instalam-se a partir das definições de acessibilidade do sistema.',
          },
          {
            title: 'Verifique se o dispositivo não está em silêncio',
            body: 'Um interruptor de silêncio ou um separador sem som explicam mais relatos de «a voz está avariada» do que qualquer outra coisa.',
          },
        ],
      },
      {
        id: 'contact',
        eyebrow: 'Contacto',
        title: 'Fale com uma pessoa.',
        body: [
          'O apoio é respondido pelas pessoas que fazem o Tiko, não por uma fila. Não há número de ticket nem planos por níveis — vai receber uma resposta direta, inclusive quando a resposta for que alguma coisa está avariada ou não está prevista.',
          'Se está a reportar um problema, o mais útil é indicar a aplicação, o dispositivo e a versão do navegador ou do sistema, o que esperava e o que aconteceu em vez disso. Uma captura de ecrã vale mais do que uma descrição.',
        ],
        tone: 'dark',
      },
      {
        id: 'contribute',
        eyebrow: 'Participar',
        title: 'Reportar, sugerir ou construir.',
        body: [
          'O Tiko é de código aberto, por isso um relatório de erro é mesmo útil e um pull request é bem-vindo. A direção do projeto vem em grande parte de pais, terapeutas e professores que descrevem o que falta — isso é muito mais rigoroso do que um roteiro escrito sem eles.',
          'Se trabalha com crianças que usam ferramentas de comunicação e alguma coisa aqui está errada, preferimos saber.',
        ],
      },
    ],
    cta: {
      title: 'Leia primeiro as respostas.',
      body: 'As perguntas frequentes cobrem custo, privacidade, contas e o que o Tiko deliberadamente não faz.',
      primaryLabel: 'Ler as perguntas frequentes',
      primaryPath: '/faq',
      secondaryLabel: 'Como funciona',
      secondaryPath: '/how-it-works',
    },
  },
}
