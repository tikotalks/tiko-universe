import type { SiteCopyOverride } from '../..'

type Pages = NonNullable<SiteCopyOverride['pages']>

/** Spanish copy for the audience-facing and help pages. */
export const esAudiencePages: Pick<Pages, 'caregivers' | 'educators' | 'faq' | 'support'> = {
  caregivers: {
    documentTitle: 'Para cuidadores',
    description:
      'Lo que Tiko promete a familias y cuidadores: ninguna cuenta antes de usarlo, sin publicidad, sin rastreo, y herramientas que puedes probar en un momento difícil sin preparar nada.',
    eyebrow: 'Para cuidadores',
    title: 'Hecho para que el primer momento no sea un formulario.',
    lede: 'Deberías poder probar una herramienta antes de confiar en ella. Tiko está pensado para que un cuidador abra una app, vea si ayuda y solo añada recuperación o sincronización cuando de verdad importe.',
    sections: [
      {
        id: 'non-negotiables',
        eyebrow: 'Principios de confianza',
        title: 'Lo que no negociamos.',
        lede: 'Son compromisos, no ajustes actuales. No cambian cuando cambian las circunstancias.',
        points: [
          {
            title: 'Gratis, siempre',
            body: 'Nunca vendemos tus datos ni la atención de un niño a cambio de acceso. Las apps son gratuitas porque cobrar por comunicarse es el trato equivocado.',
          },
          {
            title: 'Sin publicidad. Nunca.',
            body: 'Ninguna app de Tiko tiene publicidad, rastreo publicitario ni redes de anuncios de terceros.',
          },
          {
            title: 'Sin muros de acceso',
            body: 'Las apps para niños se abren y funcionan sin cuenta. Nada se interpone entre un niño y el hecho de ser entendido.',
          },
          {
            title: 'Lo mínimo posible',
            body: 'Solo recogemos lo que una app necesita de verdad para funcionar, y la mayoría de las apps de Tiko no necesitan nada.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'starting',
        eyebrow: 'Para empezar',
        title: 'No hace falta prepararse.',
        body: [
          'No hay una forma correcta de empezar ni nada que configurar antes. Abre la app que encaje con el momento en el que estás de verdad — una pregunta que responder, una rutina que atravesar, una palabra que practicar — y úsala. Si no ayuda, ciérrala. No se ha gastado nada ni se ha contratado nada.',
          'La mayoría de los cuidadores encuentran una app que les encaja y se quedan mucho tiempo con ella. Eso es un buen resultado, no una limitación. Tiko no pretende convertirse en el sitio donde tu hijo pasa el día.',
        ],
        steps: [
          {
            title: 'Empieza por el momento, no por la app',
            body: 'Elige la app que encaje con algo que ocurre hoy. Yes No para una pregunta, First para una rutina, Type para un mensaje que hay que decir.',
          },
          {
            title: 'Úsala al lado de tu hijo',
            body: 'Son herramientas para dos personas. Sentarse al lado y mostrar un toque o una frase hace más que entregar el dispositivo.',
          },
          {
            title: 'Hazla suya',
            body: 'Pon tus fotos, tus palabras, tu rutina. Una foto de los zapatos reales de tu hijo vale más que un icono de zapatos.',
          },
          {
            title: 'Añade recuperación solo si la quieres',
            body: 'Si los ajustes deben acompañarte a otro dispositivo, añade un correo una vez. Si no, sáltatelo: no cambia nada más.',
          },
        ],
      },
      {
        id: 'expectations',
        eyebrow: 'Con franqueza',
        title: 'Lo que Tiko hará y lo que no.',
        body: [
          'Tiko no diagnostica, no trata y no promete resultados. No te dirá si tu hijo progresa, y deliberadamente no lleva puntuaciones que insinúen que podría hacerlo. Si quieres una valoración, ese es el trabajo de un logopeda, y uno bueno vale muchísimo más que cualquier app.',
          'Lo que Tiko sí puede hacer es quitar fricción de momentos concretos: que te pregunten y tener forma de responder, saber qué viene después en una rutina, sacar una frase que si no se quedaría atascada. Esos momentos importan, y son trabajo suficiente para una herramienta.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Privacidad',
        title: 'Qué pasa con los datos de tu hijo.',
        body: [
          'En la mayoría de las apps de Tiko no sale nada del dispositivo. Las tarjetas que creas, las rutinas que construyes y las frases que guardas se almacenan en local. No hay analítica que registre lo que toca un niño ni identificadores publicitarios.',
          'Si activas la sincronización, el contenido que has creado se guarda para que llegue a tus otros dispositivos. Es contenido que un adulto creó a propósito, nunca un registro de cómo usó la app un niño. Puedes leer exactamente qué se guarda en la política de privacidad y, como Tiko es de código abierto, también puedes revisar el código en vez de fiarte de nuestra palabra.',
        ],
      },
    ],
    cta: {
      title: 'Pruébalo hoy con tu hijo.',
      body: 'Abre una app y úsala dos minutos. Eso te dirá más que cualquier descripción de esta página.',
      primaryLabel: 'Descubrir las apps',
      primaryPath: '/apps',
      secondaryLabel: 'Leer la política de privacidad',
      secondaryPath: '/privacy-policy',
    },
  },

  educators: {
    documentTitle: 'Para docentes y terapeutas',
    description:
      'Usar Tiko en una clase o una lista de casos: perfiles separados por niño, sin licencia por puesto, nada que instalar y ningún dato que salga del dispositivo.',
    eyebrow: 'Para docentes y terapeutas',
    title: 'Acompaña a muchos niños. Mantén cada experiencia en calma.',
    lede: 'El Gestor de Perfiles de Tiko permite a un docente o terapeuta crear un perfil ligero e independiente para cada niño, y decidir exactamente a qué llega cada uno. Los niños tienen una herramienta simple y concentrada. Los adultos mantienen los controles fuera de la vista.',
    sections: [
      {
        id: 'why-it-fits',
        eyebrow: 'En el aula',
        title: 'Hecho para los veinte minutos que tienes de verdad.',
        body: [
          'El software que llega a un centro suele dar por hecho que alguien tiene tiempo para configurarlo. En la práctica, quien sostiene la tableta tiene los pocos minutos entre una clase y la siguiente, y un niño que necesita una respuesta ahora.',
          'Tiko está hecho para esa realidad. En un dispositivo gestionado no hay nada que instalar más allá de abrir un enlace, ninguna clave de licencia que perseguir por compras y ningún día de formación antes de que una herramienta sirva. Si no encaja en tu contexto, habrás perdido unos minutos en lugar de una partida presupuestaria.',
        ],
        points: [
          {
            title: 'Sin licencia por puesto',
            body: 'Gratis para cada niño de tu clase o tu lista de casos. No hay número de usuarios que declarar ni renovación que defender.',
          },
          {
            title: 'Nada que desplegar',
            body: 'Las apps web se abren desde un enlace en un dispositivo gestionado. Las nativas son una instalación normal del App Store.',
          },
          {
            title: 'Sin cuentas infantiles',
            body: 'Los niños nunca crean accesos ni manejan contraseñas, lo que deja la herramienta fuera de la mayoría de las revisiones de protección de menores.',
          },
          {
            title: 'Funciona con la red que tienes',
            body: 'Las apps funcionan sin conexión tras el primer uso, así que una red escolar filtrada o inestable no interrumpe una sesión.',
          },
        ],
      },
      {
        id: 'profiles',
        eyebrow: 'Muchos niños',
        title: 'Un perfil independiente para cada niño.',
        body: [
          'Una lista de casos no es un solo usuario. Cada niño necesita su vocabulario, sus rutinas y sus imágenes — y ninguno debería ver los de otro.',
          'El Gestor de Perfiles mantiene todo eso separado en el mismo dispositivo. Tú cambias de perfil como adulto, y cada niño solo ve su propio contenido al abrir una app. Los controles de adulto están tras los mismos flujos reservados que se usan en todo Tiko, así que un niño curioso no acaba en los ajustes.',
        ],
        points: [
          {
            title: 'Contenido por niño',
            body: 'Las tarjetas, las rutinas y las frases guardadas pertenecen a un perfil, no al dispositivo.',
          },
          {
            title: 'Cambio solo por adultos',
            body: 'Cambiar de perfil es una acción de adulto. Los niños se quedan en la app que se les ha dado.',
          },
          {
            title: 'Pensado para dispositivos compartidos',
            body: 'Hecho para la tableta que pasa de un niño a otro a lo largo del día, que es como funcionan de verdad la mayoría de los centros.',
          },
          {
            title: 'Sin visibilidad cruzada',
            body: 'El vocabulario y el historial de un niño nunca se ven desde otro perfil.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'alongside-practice',
        eyebrow: 'Junto a tu práctica',
        title: 'Una herramienta en tus manos, no un programa que seguir.',
        body: [
          'Tiko no trae currículo, ni secuencia prescrita, ni opinión sobre cómo debería ir una sesión. No puntúa a un niño, no lo sitúa frente a una norma y no genera informes. Esos juicios son tuyos, y la evidencia que necesitas viene de tu propia observación y no de la telemetría de una app.',
          'Lo que Tiko te da es un conjunto de herramientas fiables y sin fricción a las que recurrir durante el trabajo que ya haces: ofrecer una elección binaria, construir una frase, sostener la atención en un paso o practicar una palabra sin que un pitido castigue el fallo.',
        ],
      },
      {
        id: 'data',
        eyebrow: 'Datos y protección de menores',
        title: 'La versión corta: se queda en el dispositivo.',
        body: [
          'La mayoría de las apps de Tiko no envían nada a ninguna parte. No hay analítica de las interacciones infantiles, ni publicidad, ni rastreadores de terceros. El reconocimiento de voz, donde se usa, se ejecuta en el dispositivo siempre que la plataforma lo permite, y las grabaciones no se guardan.',
          'Como las apps son de código abierto, tu responsable de informática o de protección de menores puede verificarlo en vez de fiarse de una garantía en un folleto. Si tu centro necesita el detalle por escrito, la política de privacidad y la documentación de arquitectura son públicas.',
        ],
      },
    ],
    cta: {
      title: 'Pruébalo primero con un solo niño.',
      body: 'Coge una app y un niño esta semana. Es una prueba más justa que cualquier matriz de evaluación, y no cuesta nada.',
      primaryLabel: 'Descubrir las apps',
      primaryPath: '/apps',
      secondaryLabel: 'Principios de confianza',
      secondaryPath: '/caregivers',
    },
  },

  faq: {
    documentTitle: 'Preguntas frecuentes',
    description:
      'Respuestas claras sobre qué es Tiko, qué cuesta, qué recoge y qué no pretende hacer deliberadamente.',
    eyebrow: 'Preguntas frecuentes',
    title: 'Respuestas claras antes de configurar nada.',
    lede: 'Respuestas breves a las preguntas que más hacen cuidadores, docentes y desarrolladores. Si la tuya no está, una persona de verdad está a un correo de distancia.',
    sections: [
      {
        id: 'basics',
        eyebrow: 'Lo básico',
        title: 'Qué es Tiko.',
        questions: [
          {
            question: '¿Qué es Tiko?',
            answer:
              'Tiko es una colección de apps pequeñas y gratuitas que ayudan a los niños a comunicarse, elegir, seguir rutinas y entender el tiempo. Cada app hace una cosa clara y se abre al instante — en cualquier idioma, en cualquier dispositivo, sin cuenta.',
          },
          {
            question: '¿Por qué muchas apps en vez de una?',
            answer:
              'Porque cada control extra en pantalla es una cosa más que un niño puede leer mal o tocar por error. Una app que hace una sola cosa se puede aprender por completo, y un niño que la ha aprendido puede confiar en ella. Yes No son dos botones; nunca debería crecerle un constructor de frases.',
          },
          {
            question: '¿Para quién es Tiko?',
            answer:
              'Para niños que necesitan apoyo para expresarse — por una dificultad del habla o del lenguaje, un retraso del desarrollo, una discapacidad o simplemente por estar empezando a hablar — y para las familias, docentes y terapeutas que les acompañan. Nada de esto exige un diagnóstico.',
          },
          {
            question: '¿Qué apps existen hoy?',
            answer:
              'Yes No, Type, Talk, Say, Sum y First están disponibles, en la web o en el App Store según la app. Cards, Sequence y Timer se están construyendo. La página de apps muestra exactamente dónde se puede abrir cada una.',
          },
        ],
      },
      {
        id: 'cost',
        eyebrow: 'Coste',
        title: 'Qué cuesta y por qué.',
        questions: [
          {
            question: '¿Tiko es de verdad gratis?',
            answer:
              'Sí. Las apps de Tiko son gratuitas, siempre. No es una vista previa temporal, ni un anzuelo, ni un embudo de venta. No hay un plan de pago reteniendo una función que un niño necesita.',
          },
          {
            question: '¿Tiko mostrará publicidad?',
            answer:
              'No. Sin publicidad, nunca. Tiko debe poder abrirse al lado de un niño sin contenido comercial, mensajes patrocinados ni nada diseñado para captar su atención.',
          },
          {
            question: 'Si es gratis y sin publicidad, ¿cómo se financia?',
            answer:
              'Tiko está construido como un proyecto de código abierto y no como una empresa con objetivos de crecimiento. Eso mantiene bajos los costes: las apps son diminutas y la mayoría no habla con ningún servidor.',
          },
          {
            question: '¿Los datos de mi hijo son el pago?',
            answer:
              'No. Aquí gratis no significa financiado con publicidad. La mayoría de las apps de Tiko no recogen nada, así que no habría nada que vender aunque quisiéramos.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'accounts',
        eyebrow: 'Cuentas y privacidad',
        title: 'Qué hay que ceder para usarlo.',
        questions: [
          {
            question: '¿Necesito una cuenta?',
            answer:
              'No. Las apps de Tiko se abren y funcionan sin muro de acceso. La recuperación opcional para el cuidador está disponible más tarde con un enlace mágico por correo, pero la app del niño nunca empieza creando una cuenta.',
          },
          {
            question: '¿Qué datos recoge Tiko?',
            answer:
              'En la mayoría de las apps, ninguno. No hay analítica de lo que toca un niño, ni identificadores publicitarios, ni rastreadores de terceros. Lo que creas — tarjetas, rutinas, frases guardadas — se queda en el dispositivo salvo que actives la sincronización.',
          },
          {
            question: '¿Tiko graba la voz de mi hijo?',
            answer:
              'Donde una app escucha, el reconocimiento de voz se ejecuta en el dispositivo siempre que la plataforma lo permite, y las grabaciones no se guardan ni se envían nunca. Las apps que no necesitan micrófono no lo piden.',
          },
          {
            question: '¿Puedo verificar algo de esto?',
            answer:
              'Sí, y deberías. Tiko es de código abierto, así que el código que hay detrás de estas afirmaciones es público. La política de privacidad explica en lenguaje claro qué se guarda.',
          },
        ],
      },
      {
        id: 'scope',
        eyebrow: 'Lo que Tiko no es',
        title: 'Los límites, dichos claramente.',
        questions: [
          {
            question: '¿Tiko es un producto terapéutico o médico?',
            answer:
              'No. Tiko no diagnostica, no trata y no promete resultados. Es un conjunto de herramientas de comunicación y aprendizaje, no una intervención clínica, y no sustituye a un logopeda.',
          },
          {
            question: '¿Tiko mide el progreso?',
            answer:
              'No, deliberadamente. No hay puntuaciones, rachas ni paneles. El progreso en comunicación no es algo que una app deba calificar, y un número en pantalla suele condicionar más la conducta del adulto que la del niño.',
          },
          {
            question: '¿Funcionará con mi hijo?',
            answer:
              'Sinceramente no lo sabemos, y quien diga lo contrario está adivinando. Las apps son gratuitas y se abren al instante, así que la forma más barata de averiguarlo es probar una unos minutos.',
          },
        ],
      },
      {
        id: 'practical',
        eyebrow: 'Práctica',
        title: 'Dispositivos, idiomas y uso sin conexión.',
        questions: [
          {
            question: '¿Qué idiomas habla Tiko?',
            answer:
              'Las apps son multilingües desde la base, y el idioma que elige un cuidador le acompaña por todas las apps de Tiko y por esta web. Donde un idioma todavía no tiene traducción de interfaz, la app recurre al inglés en vez de negarse a abrir.',
          },
          {
            question: '¿Funciona sin conexión?',
            answer:
              'Sí. Las apps cargan su contenido principal en el dispositivo y siguen funcionando sin red. Todo lo que necesita internet es un añadido, y no poder alcanzarlo no detiene la app.',
          },
          {
            question: '¿En qué dispositivos funciona?',
            answer:
              'En cualquier navegador moderno, más apps nativas de iPhone y iPad para las que ya están en el App Store. Android sigue el mismo planteamiento.',
          },
          {
            question: '¿Puedo usarlo con una clase o una lista de casos?',
            answer:
              'Sí. El Gestor de Perfiles mantiene un perfil independiente por niño en un dispositivo compartido, y no hay licencia por puesto que comprar ni declarar.',
          },
        ],
      },
    ],
    cta: {
      title: '¿Te queda alguna duda?',
      body: 'El soporte es una persona, no una cola de tickets. Pregunta y tendrás una respuesta directa.',
      primaryLabel: 'Pedir ayuda',
      primaryPath: '/support',
      secondaryLabel: 'Por qué existe Tiko',
      secondaryPath: '/why-tiko',
    },
  },

  support: {
    documentTitle: 'Soporte',
    description:
      'Ayuda con las apps de Tiko para niños, cuidadores y docentes: temas habituales, solución de problemas y cómo hablar con una persona.',
    eyebrow: 'Soporte',
    title: 'Estamos aquí para ayudar.',
    lede: 'Ayuda con las apps de Tiko para niños, cuidadores y docentes. La mayoría de las respuestas están abajo, y una persona de verdad está a un correo de distancia.',
    sections: [
      {
        id: 'common',
        eyebrow: 'Temas habituales',
        title: 'Respuestas rápidas para empezar.',
        points: [
          {
            title: 'Primeros pasos',
            body: 'Todas las apps de Tiko se abren al momento: sin cuenta ni contraseña. Abre el enlace o instala la app y empieza a usarla.',
          },
          {
            title: 'Cuentas y dispositivos',
            body: 'Tiko usa sesiones de dispositivo en lugar de contraseñas. Si cambias o reinicias un dispositivo, añade antes un correo de recuperación para que tu contenido te acompañe.',
          },
          {
            title: 'Voces e idiomas',
            body: 'Elige una voz y un idioma que encajen con el niño. Las apps de Tiko admiten muchos idiomas y cambian al instante desde los ajustes.',
          },
          {
            title: 'Uso sin conexión',
            body: 'Las apps siguen funcionando sin red tras el primer uso. La sincronización se reanuda sola cuando vuelve la conexión.',
          },
          {
            title: 'Privacidad y datos',
            body: 'La mayoría de las apps no guardan nada fuera del dispositivo. Lo que creas se queda en local salvo que actives la sincronización a propósito.',
          },
          {
            title: '¿Algo no funciona?',
            body: 'Cuéntanos qué has visto, en qué dispositivo y en qué app. Con eso solemos tener suficiente para encontrarlo.',
          },
        ],
      },
      {
        id: 'troubleshooting',
        eyebrow: 'Solución de problemas',
        title: 'Las tres cosas que arreglan casi todo.',
        steps: [
          {
            title: 'Recarga la app',
            body: 'Ciérrala del todo y vuelve a abrirla. Las apps web se actualizan en segundo plano, y una recarga coge la versión más reciente.',
          },
          {
            title: 'Revisa el idioma y la voz',
            body: 'Si la voz suena mal o no se oye, puede que la voz elegida no esté instalada en el dispositivo. Prueba otra en los ajustes; en iOS las voces extra se instalan desde los ajustes de accesibilidad del sistema.',
          },
          {
            title: 'Comprueba que el dispositivo no esté en silencio',
            body: 'Un interruptor de silencio o una pestaña silenciada explican más avisos de «la voz no funciona» que ninguna otra cosa.',
          },
        ],
      },
      {
        id: 'contact',
        eyebrow: 'Contacto',
        title: 'Habla con una persona.',
        body: [
          'El soporte lo atienden las personas que construyen Tiko, no una cola. No hay número de ticket ni planes por niveles: tendrás una respuesta directa, incluso cuando la respuesta sea que algo está roto o no está previsto.',
          'Si informas de un problema, lo más útil es indicar la app, el dispositivo y la versión del navegador o del sistema, qué esperabas y qué ocurrió en su lugar. Una captura vale más que una descripción.',
        ],
        tone: 'dark',
      },
      {
        id: 'contribute',
        eyebrow: 'Participar',
        title: 'Informa, propón o construye.',
        body: [
          'Tiko es de código abierto, así que un informe de error es realmente útil y una pull request es bienvenida. La dirección del proyecto viene en gran parte de familias, terapeutas y docentes que describen lo que falta: es mucho más certero que una hoja de ruta escrita sin ellos.',
          'Si trabajas con niños que usan herramientas de comunicación y algo de esto está mal, preferimos saberlo.',
        ],
      },
    ],
    cta: {
      title: 'Lee primero las respuestas.',
      body: 'Las preguntas frecuentes cubren coste, privacidad, cuentas y lo que Tiko deliberadamente no hace.',
      primaryLabel: 'Leer las preguntas frecuentes',
      primaryPath: '/faq',
      secondaryLabel: 'Cómo funciona',
      secondaryPath: '/how-it-works',
    },
  },
}
