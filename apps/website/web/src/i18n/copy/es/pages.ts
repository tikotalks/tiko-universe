import type { SiteCopyOverride } from '../..'

/**
 * Spanish page copy.
 *
 * Translated as prose rather than string-for-string: the English is written to
 * be read, and a literal rendering of it reads like software. Section ids are
 * deliberately absent — they are anchors, not text, and must not be translated.
 */
export const esPages: NonNullable<SiteCopyOverride['pages']> = {
  whyTiko: {
    documentTitle: 'Por qué existe Tiko',
    description:
      'Por qué Tiko es una familia de apps pequeñas, gratuitas y multilingües en lugar de una gran plataforma de comunicación — y por qué nada de esto cuesta dinero.',
    eyebrow: 'Por qué existe Tiko',
    title: 'Divertido, sencillo y en todos los idiomas.',
    lede: 'Tiko es una familia de apps pequeñas, bonitas y gratuitas que ayudan a los niños a comunicarse, elegir, seguir rutinas y entender el tiempo. Cada app se abre en segundos, funciona en cualquier idioma y nunca pide una cuenta — porque el primer paso debería ser usarla, no configurarla.',
    sections: [
      {
        id: 'the-problem',
        eyebrow: 'El problema',
        title: 'Las herramientas de comunicación piden demasiado antes de ayudar.',
        body: [
          'Un niño que todavía no puede decir lo que necesita está teniendo un día difícil ahora mismo — no después de una prueba, una licencia, una formación y un inicio de sesión. Y sin embargo, la mayoría del software de comunicación pide las cuatro cosas. Llega como una plataforma: una cuenta que crear, una suscripción que justificar, una pantalla de configuración que recorrer y un manual que leer antes de que nadie diga una palabra.',
          'Ese coste no es solo dinero. Son los veinte minutos que una maestra no tiene entre clases, la confianza que un padre pierde cuando la primera pantalla es un formulario, y el dispositivo especializado que se queda en el armario porque nadie sabe muy bien cómo configurarlo. La herramienta acaba sirviendo a la institución que la compró y no al niño que la sostiene.',
          'Tiko empieza por el otro extremo. La primera pantalla es la herramienta. Todo lo demás — ajustes, recuperación, sincronización entre dispositivos — llega después, para el adulto, y solo si lo quiere.',
        ],
      },
      {
        id: 'small-apps',
        eyebrow: 'La forma',
        title: 'Muchas apps pequeñas, no una grande.',
        lede: 'Tiko no es un panel de control con modos. Es un conjunto de apps separadas, cada una haciendo bien una sola cosa.',
        body: [
          'Un niño que aprende a responder una pregunta no necesita un constructor de frases en la misma pantalla. Un niño que sigue una rutina de mañana no necesita un teclado. Cada control extra es una cosa más que se puede leer mal, tocar por error o que distrae — y para un niño que ya se esfuerza por hacerse entender, ese coste es real.',
          'Por eso cada app de Tiko es su propia app. Yes No son dos botones. Type es un campo de texto y un botón para hablar. First muestra un paso cada vez. Abres la que encaja con el momento, y la pantalla no contiene casi nada más.',
        ],
        points: [
          {
            title: 'Una pantalla, una tarea',
            body: 'Cada app se abre directamente en lo que hace. Sin pantalla de inicio que recorrer, sin modo que elegir antes.',
          },
          {
            title: 'Se aprende una vez',
            body: 'Como una app hace una sola cosa, un niño puede aprenderla por completo. La confianza viene de una herramienta que se comporta igual cada vez.',
          },
          {
            title: 'Nada que se quede pequeño',
            body: 'Empezar con Yes No no ata a nadie. Las apps son independientes: pasar a Talk o a Type es abrir otra app, no migrar una cuenta.',
          },
          {
            title: 'Lo bastante pequeña para confiar',
            body: 'Una herramienta que un cuidador entiende en un minuto es una herramienta a la que recurrirá de verdad en un momento difícil.',
          },
        ],
      },
      {
        id: 'language',
        eyebrow: 'Idioma',
        title: 'Multilingüe desde el principio, no traducida después.',
        body: [
          'Una herramienta de comunicación que solo funciona en un idioma deja fuera a los niños que más la necesitan: el niño de una casa bilingüe, el niño cuya lengua familiar no es la de su escuela, el niño que ha cambiado de país y ha perdido sus palabras dos veces.',
          'Tiko habla el idioma del niño, no el de quien lo programa. La interfaz, la voz y los contenidos son traducibles, y el idioma que elige un cuidador le acompaña por todas las apps de Tiko y por esta web. Donde un idioma todavía no tiene traducción de interfaz, la app recurre al inglés para esas palabras en lugar de negarse a abrir.',
        ],
      },
      {
        id: 'why-free',
        eyebrow: 'Por qué gratis',
        title: 'Porque el acceso no debería llevar etiqueta de precio.',
        lede: 'Las apps de Tiko son gratuitas, siempre. Ni una prueba, ni un anzuelo, ni un embudo de venta.',
        body: [
          'Comunicarse no es una función premium. Un niño debería poder abrir una app de Tiko ahora mismo, sin que un adulto decida antes si este momento concreto merece pagarse — porque esa decisión, tomada bajo presión, suele tomarse en contra del niño.',
        ],
        points: [
          {
            title: 'Sin dudarlo',
            body: 'Prueba una herramienta con un niño de inmediato, sin sopesar si el momento justifica el coste.',
          },
          {
            title: 'Sin presión',
            body: 'Sin urgencia, sin culpa, sin publicidad, sin avisos para mejorar el plan. Nada convierte el hecho de ser entendido en una transacción.',
          },
          {
            title: 'Sin trato oculto',
            body: 'Gratis no significa financiado con publicidad. Tiko no cambia la atención ni los datos de un niño por acceso — no hay nada que cambiar, porque no se recoge nada.',
          },
        ],
        tone: 'primary',
      },
      {
        id: 'not-therapy',
        eyebrow: 'Lo que Tiko no es',
        title: 'Una herramienta, no un tratamiento.',
        body: [
          'Tiko no diagnostica, no trata y no promete resultados. No es un programa de terapia, ni una evaluación, ni un sustituto de un logopeda. No hay puntuaciones, ni paneles de progreso, ni informes que comparen a un niño con otro.',
          'Lo que Tiko ofrece es una buena herramienta para un momento concreto: una forma de responder, de elegir, de decir una frase, de seguir una rutina. Los logopedas y los maestros la usan junto a su propio trabajo, y las familias en las horas corrientes entre citas. Es deliberadamente una promesa más modesta que la de la mayoría del software de este ámbito.',
        ],
      },
      {
        id: 'professionals',
        eyebrow: 'Quién le da forma',
        title: 'Hecho con logopedas, no solo para ellos.',
        lede: 'Logopedas, maestros y otros profesionales revisan Tiko y nos dicen qué está mal.',
        body: [
          'Un programador puede construir una herramienta de comunicación que funcione. Si funciona para un niño que lucha por hacerse entender es una pregunta muy distinta, y no se responde leyendo documentación. La responden las personas que se sientan con esos niños cada semana.',
          'Por eso las apps las miran logopedas, maestros de educación especial y otros profesionales — y sus comentarios las cambian. Algunos son pequeños: un objetivo demasiado cerca de otro, una palabra equivocada en un dialecto concreto, una celebración demasiado estimulante para los niños con los que trabajan. Otros no: que Say no tenga sonido de error y que ninguna app de Tiko lleve puntuación vinieron de ahí.',
          'Esto no es un aval clínico y Tiko no lo reclama. Es una revisión de diseño hecha por personas cuyo criterio vale más que el nuestro en las preguntas que más importan, y es la razón por la que varias apps son como son y no como empezaron.',
        ],
        points: [
          {
            title: 'Revisado desde la mirada terapéutica',
            body: 'Los profesionales miran las apps pensando en los niños a los que acompañan, y dicen claramente qué estorbaría.',
          },
          {
            title: 'Comentarios que cambian el producto',
            body: 'Cuando una revisión dice que un patrón no sirve para estos niños, el patrón cambia. Los sonidos de error retirados y la ausencia de puntuación salieron de ahí.',
          },
          {
            title: 'Sigue sin ser un tratamiento',
            body: 'La aportación profesional hace que Tiko esté mejor diseñado. No lo convierte en un programa de terapia, y no lo presentamos así.',
          },
        ],
        tone: 'secondary',
      },
      {
        id: 'open-source',
        eyebrow: 'Abierto por defecto',
        title: 'Construido a la vista, moldeado por quienes lo usan.',
        body: [
          'Tiko es de código abierto. El código, los contratos de contenido y las formas de las API son públicos, así que un centro educativo, un logopeda o un programador puede ver exactamente qué hace una app con los datos de un niño — que en la mayoría de las apps de Tiko es nada en absoluto.',
          'También significa que la dirección viene de quienes lo usan. Familias, logopedas y maestros describen lo que falta con mucha más precisión que una hoja de ruta escrita en aislamiento, y un proyecto abierto puede actuar sin esperar a un argumento comercial.',
        ],
      },
    ],
    cta: {
      title: 'Abre una y compruébalo.',
      body: 'La forma más rápida de juzgar Tiko es usarlo dos minutos con un niño. Sin cuenta, sin descarga, sin sala de espera.',
      primaryLabel: 'Descubrir las apps',
      primaryPath: '/apps',
      secondaryLabel: 'Cómo funciona',
      secondaryPath: '/how-it-works',
    },
  },

  howItWorks: {
    documentTitle: 'Cómo funciona Tiko',
    description:
      'Cómo se abren las apps de Tiko sin cuenta, qué ocurre en el dispositivo y cómo funciona la recuperación opcional para cuidadores.',
    eyebrow: 'Cómo funciona Tiko',
    title: 'Primero abrir. La configuración se queda al fondo.',
    lede: 'Tiko empieza en el dispositivo. Las apps se abren y funcionan de inmediato. La recuperación para el cuidador puede llegar más tarde con un enlace mágico por correo — nunca antes de que el niño pueda usar la herramienta.',
    sections: [
      {
        id: 'first-two-minutes',
        eyebrow: 'La experiencia',
        title: 'Tres momentos, sin fricción.',
        steps: [
          {
            title: 'Abrir el enlace',
            body: 'Un cuidador comparte un enlace, lo guarda en favoritos o instala la app desde el App Store. No hay nada que licenciar ni a nadie a quien pedir permiso.',
          },
          {
            title: 'Usarla enseguida',
            body: 'La app está lista: sin registro, sin tutorial y sin proceso de bienvenida. El niño ve la herramienta en sí, directamente.',
          },
          {
            title: 'Recuperar después, si quieres',
            body: 'Si un cuidador quiere que los ajustes le acompañen a otro dispositivo, añade un correo y lo confirma una vez. Es opcional, ocurre después y el niño nunca lo ve.',
          },
        ],
      },
      {
        id: 'device-first',
        eyebrow: 'Identidad en el dispositivo',
        title: 'Nunca contraseñas.',
        body: [
          'Cada app de Tiko crea una sesión de dispositivo la primera vez que se abre. Se genera localmente, pertenece a ese dispositivo y basta para todo lo que la app hace. Sin correo, sin contraseña, sin cuenta.',
          'Esta es la parte que la mayoría del software de comunicación hace al revés. Una cuenta existe para que una empresa te reconozca entre dispositivos — una necesidad real, pero de adultos, y normalmente se coloca delante del niño como precio de entrada. Tiko la trata por lo que es: una comodidad opcional para el cuidador, ofrecida más tarde.',
        ],
        points: [
          {
            title: 'Sesión de dispositivo',
            body: 'Se crea automáticamente al abrir por primera vez, se guarda en local y nunca exige iniciar sesión.',
          },
          {
            title: 'Recuperación con enlace mágico',
            body: 'Opcional. Un cuidador añade un correo y lo confirma una vez para activar la sincronización entre dispositivos.',
          },
          {
            title: 'Sin trámites para el niño',
            body: 'La recuperación y la administración son solo para adultos. A un niño nunca se le muestra un formulario de cuenta.',
          },
          {
            title: 'Igual en todas las plataformas',
            body: 'Las sesiones funcionan igual en web, iOS y Android, así que una app se comporta igual donde sea que se ejecute.',
          },
        ],
        tone: 'dark',
      },
      {
        id: 'offline',
        eyebrow: 'Fiabilidad',
        title: 'Sigue funcionando cuando la red no lo hace.',
        body: [
          'Las apps de Tiko cargan su contenido principal en el dispositivo y funcionan desde ahí. Una conexión que se cae, una red escolar que bloquea medio internet o un viaje en coche sin cobertura no le quitan a un niño la posibilidad de responder una pregunta.',
          'Todo lo que de verdad necesita red — sincronizar ajustes, descargar un juego de imágenes nuevo — es un añadido. Si falla, la app sigue haciendo lo que hacía.',
        ],
      },
      {
        id: 'privacy',
        eyebrow: 'Qué se recoge',
        title: 'Casi nada, y nunca del niño.',
        body: [
          'La mayoría de las apps de Tiko no recogen absolutamente nada. No hay analítica de los toques de un niño, ni identificadores publicitarios, ni rastreadores de terceros. El reconocimiento de voz, cuando una app lo usa, se ejecuta en el dispositivo siempre que la plataforma lo permite, y las grabaciones no se guardan ni se envían jamás.',
          'Cuando una app sí guarda algo — las tarjetas propias de un cuidador, una rutina que ha creado, una frase guardada —, es contenido que el adulto creó a propósito, y se queda en el dispositivo salvo que active la sincronización.',
        ],
        points: [
          {
            title: 'Sin publicidad, nunca',
            body: 'Ninguna app de Tiko tiene publicidad, redes publicitarias ni rastreo con fines publicitarios.',
          },
          {
            title: 'Sin muro de acceso',
            body: 'Las apps para niños se abren y funcionan sin cuenta de ningún tipo.',
          },
          {
            title: 'En el dispositivo siempre que se pueda',
            body: 'El reconocimiento de voz usa el motor local de la plataforma donde existe. Las grabaciones no se conservan.',
          },
          {
            title: 'Comprobable a la vista',
            body: 'Las apps son de código abierto, así que lo que dice esta página se puede verificar en lugar de creerlo.',
          },
        ],
      },
      {
        id: 'platforms',
        eyebrow: 'Un Tiko, muchas pantallas',
        title: 'La misma experiencia, en todas partes.',
        body: [
          'La web es la forma más rápida de probar Tiko: basta un enlace. Las apps nativas añaden lo que un navegador hace peor — fiabilidad sin conexión, un icono en la pantalla de inicio que el niño reconoce y mejor soporte de voz.',
          'Uses la que uses, la app se comporta igual. Debajo están los mismos contratos, así que una rutina creada en una tableta es la misma rutina en un teléfono.',
        ],
      },
    ],
    cta: {
      title: '¿Quieres el detalle técnico?',
      body: 'La documentación de arquitectura y de API explica cómo encajan los workers, el almacenamiento y los clientes.',
      primaryLabel: 'Documentación de arquitectura',
      primaryPath: '/docs/architecture',
      secondaryLabel: 'Contratos de API',
      secondaryPath: '/docs/apis',
    },
  },
}
