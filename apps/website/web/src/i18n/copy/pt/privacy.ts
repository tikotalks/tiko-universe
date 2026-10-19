import type { SiteCopy } from '../..'

/** Política de privacidade em português. As âncoras (`id`) não são traduzidas. */
export const ptPrivacy: SiteCopy['privacy'] = {
  documentTitle: 'Política de privacidade',
  description: 'Como as aplicações Tiko e o tikotalks.com tratam os dados, em linguagem clara.',
  eyebrow: 'Política de privacidade',
  title: 'O que recolhemos e o que não recolhemos.',
  lede: 'O Tiko faz aplicações calmas e acessíveis para crianças. A privacidade não é um acrescento — faz parte do desenho. Esta política explica em linguagem clara como as aplicações Tiko e o tikotalks.com tratam os dados.',
  lastUpdatedLabel: 'Última atualização',
  lastUpdated: 'junho de 2026',
  supportEmail: 'support@tikotalks.com',
  sections: [
    {
      id: 'promise',
      title: 'A nossa promessa',
      bullets: [
        'Gratuito, sempre. Nunca vendemos os seus dados nem a atenção de uma criança em troca de acesso.',
        'Sem publicidade. Nunca. Nas aplicações Tiko não há publicidade, rastreio para publicidade nem redes de anúncios de terceiros.',
        'Sem barreiras de início de sessão. As aplicações para crianças abrem e funcionam sem conta.',
        'Recolhemos o mínimo possível, e apenas aquilo de que uma aplicação precisa mesmo para funcionar.',
      ],
    },
    {
      id: 'device-first',
      title: 'No dispositivo por omissão',
      body: [
        'As aplicações Tiko são feitas para funcionar no dispositivo. As suas definições, frases guardadas, rascunhos e conteúdo recente ficam localmente para que as aplicações se mantenham rápidas e utilizáveis sem ligação. Se usar uma aplicação sem iniciar sessão, esse conteúdo fica no seu dispositivo.',
      ],
    },
    {
      id: 'accounts',
      title: 'Contas e sincronização opcionais',
      body: [
        'O Tiko usa identidade baseada no dispositivo em vez de palavras-passe. Se optar por ativar a recuperação para cuidadores ou a sincronização entre dispositivos, podemos guardar um endereço de e-mail para lhe enviar uma ligação de acesso e associar os seus dispositivos. É sempre opcional e sempre transparente — a aplicação da criança nunca começa pela criação de uma conta.',
      ],
    },
    {
      id: 'speech',
      title: 'Voz e conteúdo',
      body: [
        'Algumas aplicações, como o Tiko Type e o Tiko Talk, conseguem ler texto em voz alta. Para gerar uma voz natural, o texto que pede para ser lido pode ser enviado para o nosso serviço de voz e processado apenas para devolver áudio. Não usamos esse conteúdo para criar perfis publicitários e não o vendemos.',
      ],
    },
    {
      id: 'what-we-do-not-do',
      title: 'O que não fazemos',
      bullets: [
        'Não mostramos publicidade nem usamos rastreadores publicitários.',
        'Não vendemos nem alugamos dados pessoais.',
        'Não exigimos que uma criança crie uma conta ou partilhe dados pessoais para usar uma aplicação.',
        'Não fazemos afirmações médicas, de diagnóstico ou de resultados terapêuticos, e não recolhemos dados de saúde para esses fins.',
      ],
    },
    {
      id: 'children',
      title: 'Privacidade das crianças',
      body: [
        'As aplicações Tiko são desenhadas para poderem ser abertas com tranquilidade ao lado de uma criança. Como funcionam sem contas e sem publicidade, uma criança pode usá-las sem partilhar informação pessoal. Quando um cuidador opta por configurar a recuperação opcional, essa informação de conta pertence ao cuidador, não à criança.',
      ],
    },
    {
      id: 'retention',
      title: 'Conservação e eliminação',
      body: [
        'O conteúdo guardado localmente fica no dispositivo até o apagar ou remover a aplicação. Se criou uma conta opcional, pode pedir-nos a qualquer momento que a eliminemos, juntamente com os dados associados, escrevendo para {email}.',
      ],
    },
    {
      id: 'changes',
      title: 'Alterações a esta política',
      body: [
        'Se mudarmos a forma como tratamos os dados, atualizaremos esta página e a data acima. As alterações significativas serão indicadas com clareza.',
      ],
    },
    {
      id: 'contact',
      title: 'Contacte-nos',
      body: [
        'Dúvidas sobre privacidade ou sobre os seus dados? Escreva para {email} e uma pessoa a sério vai ajudar.',
      ],
    },
  ],
}
