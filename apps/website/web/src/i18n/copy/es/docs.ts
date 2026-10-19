import type { SiteCopy } from '../..'

/**
 * Documentación para desarrolladores en español.
 *
 * Los nombres de servicios, las rutas y los ejemplos de código no se traducen:
 * son direcciones, no prosa. Por eso los ejemplos de código no están aquí y
 * recurren al inglés, que es lo que se busca.
 */
export const esDocs: SiteCopy['docs'] = {
  sidebarLabel: 'Docs',
  navAriaLabel: 'Páginas de documentación',
  articleEyebrow: 'Documentación de la plataforma Tiko',
  pages: {
    'docs-overview': {
      label: 'Visión general',
      title: 'Documentación de Tiko Universe',
      lede: 'La arquitectura, la filosofía de producto y el mapa de API de la plataforma Tiko.',
      summary: 'Un punto de entrada público y legible sobre cómo está construido Tiko y por qué el sistema tiene esta forma.',
      callouts: [
        {
          title: 'Apps pequeñas, plataforma compartida',
          body: 'Yes No, Talk, Type, Cards, Sequence, Timer, Radio, Media y las futuras apps reutilizan los mismos contratos de identidad, estado, contenido, medios, generación e interfaz.',
        },
        {
          title: 'API primero, nativo de Cloudflare',
          body: 'Los clientes son deliberadamente ligeros. La autoridad vive en Cloudflare Workers con D1, R2, KV como caché y Queues donde el trabajo asíncrono se hace necesario.',
        },
        {
          title: 'Sin trámites de cuenta al principio',
          body: 'Una herramienta para un niño debe abrirse y ser útil antes de que aparezcan la recuperación, la sincronización o la administración.',
        },
      ],
      sections: [
        {
          eyebrow: 'Qué cubre esto',
          title: 'Un mapa práctico para quien construye',
          body: [
            'Esta documentación explica Tiko como producto y como plataforma de backend. No es material de marketing ni un vertedero de detalles de implementación.',
            'La regla importante es simple: si un comportamiento afecta a los clientes web, iOS o Android, debe estar en un contrato de API documentado antes de convertirse en lógica de cliente oculta.',
          ],
          bullets: [
            'Filosofía: principios de producto centrados en el niño y restricciones de ingeniería.',
            'Arquitectura: apps, packages, Workers, propiedad del almacenamiento, dominios y límites de despliegue.',
            'API: las familias de contratos actuales y las formas estables que los clientes pueden esperar.',
          ],
        },
        {
          eyebrow: 'Forma actual de la plataforma',
          title: 'Un repositorio, responsabilidades claras',
          body: [
            'Tiko Universe es un monorepo con npm workspaces: apps por producto, packages de TypeScript compartidos y servicios Cloudflare Worker. El código nativo de iOS vive junto a su producto donde existe; Android sigue los mismos contratos de API en vez de copiar la lógica de backend al cliente.',
          ],
          bullets: [
            'Apps: herramientas para niños y superficies públicas o de administración que las acompañan.',
            'Packages: clientes tipados, contratos compartidos, Tiko UI, i18n, medios, identidad y utilidades de prueba.',
            'Workers: identidad, estado de apps, contenido, medios, generación, administración y compatibilidad temporal de TTS.',
          ],
        },
      ],
    },
    'docs-philosophy': {
      label: 'Filosofía',
      title: 'Filosofía de producto e ingeniería',
      lede: 'Tiko es software que piensa primero en el niño. El backend existe para que el momento del niño siga siendo inmediato, tranquilo y recuperable, sin convertirse en software corporativo.',
      summary: 'Los principios irrenunciables detrás de cada decisión de arquitectura.',
      callouts: [
        { title: 'Inmediato', body: 'Las apps se abren y funcionan de inmediato. La primera pantalla nunca es un formulario de acceso.' },
        { title: 'Pequeño', body: 'Cada app hace una cosa clara en lugar de convertirse en un panel de control.' },
        { title: 'Recuperable', body: 'Las sesiones de dispositivo pueden volverse recuperables más tarde con un enlace mágico por correo.' },
      ],
      sections: [
        {
          eyebrow: 'Doctrina',
          title: 'Lo irrenunciable',
          body: [
            'La doctrina es estricta a propósito, porque «solo una excepción» acaba en una plataforma que seis meses después nadie entiende. Tiko lo evita manteniendo la identidad, las API y la propiedad del almacenamiento aburridas y explícitas.',
          ],
          bullets: [
            'Sin contraseñas y sin muros de acceso antes de usarlo.',
            'Sin runtime de Supabase, sin puente para usuarios antiguos, sin obligación de migración y sin suponer Better Auth.',
            'Identidad en el dispositivo por defecto; recuperación opcional por correo con enlaces mágicos.',
            'D1 es la fuente relacional de verdad. R2 es la fuente de verdad de los bytes. KV es solo caché.',
            'Lezu gestiona las traducciones; Tiko consume paquetes y respaldos versionados.',
            'Web, iOS y Android son clientes iguales de las mismas API HTTPS JSON.',
          ],
        },
        {
          eyebrow: 'Modelo de producto',
          title: 'Por qué apps pequeñas',
          body: [
            'Tiko no es una gran «plataforma para necesidades especiales» con un laberinto de funciones. Es un universo de herramientas pequeñas y concretas que se abren en el momento en que un niño o un cuidador necesita una cosa.',
            'Las herramientas separadas reducen la carga cognitiva, mantienen las zonas táctiles evidentes y facilitan comprobar si una herramienta ayuda antes de pedir al cuidador que confíe en la sincronización, la recuperación o la administración.',
          ],
          bullets: [
            'Yes No: respuestas rápidas de dos opciones.',
            'Type: escritura de texto y salida por voz.',
            'Cards: elecciones visuales y contenido familiar.',
            'Sequence: rutinas ordenadas y pasos siguientes.',
            'Timer: hacer visible el tiempo y acompañar las transiciones.',
          ],
        },
        {
          eyebrow: 'Modelo de ingeniería',
          title: 'Contratos antes que clientes',
          body: [
            'El código de cliente puede ser agradable y resistente. Lo que no puede es convertirse en secreto en el backend. Si un comportamiento tiene autoridad, persistencia, secretos de proveedor o efectos entre dispositivos, pertenece a un Worker y a un contrato documentado.',
          ],
          bullets: [
            'Los packages exponen clientes tipados, modelos, fixtures y composición de interfaz.',
            'Los Workers son dueños de la autenticación, los límites de tasa, el acceso a D1/R2/KV/Queues, las llamadas a proveedores y las mutaciones duraderas.',
            'Las apps pueden mantener estado local de respaldo para que el flujo del niño siga siendo usable cuando falla una llamada de red.',
          ],
        },
      ],
    },
    'docs-architecture': {
      label: 'Arquitectura',
      title: 'Arquitectura',
      lede: 'Tiko es una plataforma nativa de Cloudflare: apps por producto, packages de cliente compartidos, Workers como servicios de dominio, D1/R2 para estado duradero y KV solo como caché.',
      summary: 'Cómo encajan el monorepo, los dominios, el almacenamiento, los workers y los clientes.',
      callouts: [
        { title: 'Clientes', body: 'Las apps web en Vue, las apps iOS en SwiftUI y los futuros clientes Android consumen los mismos contratos de API.' },
        { title: 'Servicios', body: 'Los Workers se separan por límite de dominio, no por el archivo que existió primero.' },
        { title: 'Almacenamiento', body: 'D1 es dueño de la verdad relacional. R2 es dueño de los bytes. KV es caché reconstruible.' },
      ],
      sections: [
        {
          eyebrow: 'Mapa del sistema',
          title: 'El flujo general',
          body: [
            'La arquitectura es deliberadamente sencilla. Los clientes hablan mediante API HTTPS JSON. Los Workers validan la identidad y son dueños de las mutaciones. El almacenamiento está ligado al Worker que posee el dominio.',
          ],
        },
        {
          eyebrow: 'Repositorio',
          title: 'Monorepo con el producto primero',
          body: [
            'El repositorio se organiza primero por productos y luego por packages de plataforma y Workers. Así el contexto de una app para niños se mantiene cerca de sus implementaciones web y nativa, compartiendo contratos a través de los packages.',
          ],
          bullets: [
            '`apps/<product>/web` contiene apps de Vue desplegadas en Cloudflare Pages.',
            '`apps/<product>/ios` contiene clientes SwiftUI donde existe trabajo nativo.',
            '`packages/*` contiene contratos de TypeScript compartidos, clientes, Tiko UI, i18n, medios, identidad y utilidades de prueba.',
            '`workers/*` contiene servicios Cloudflare Worker con sus propios bindings de D1/R2 y sus pruebas.',
          ],
        },
        {
          eyebrow: 'Límites de servicio',
          title: 'Responsabilidad de cada Worker',
          body: [
            'Cada Worker tiene una tarea estrecha. Eso hace más fáciles de razonar la autorización, las migraciones, la limitación de tasa y el riesgo de despliegue.',
          ],
          bullets: [
            '`identity-api`: sujetos de Ankore, dispositivos, sesiones, cuentas y desafíos por correo.',
            '`app-api`: ajustes y estado de app por usuario.',
            '`content-api`: contenido publicado, registros tipo CMS y modelos de lectura cacheables.',
            '`media-api`: autorización de subida, metadatos de medios, propiedad y acceso a R2.',
            '`generation-api`: TTS, generación de frases e imágenes, metadatos de medios generados y futuras queues.',
            '`admin-api`: operaciones peligrosas solo de administración, informes, moderación y herramientas de soporte.',
            '`tts-api`: superficie de compatibilidad temporal que debería integrarse en generation-api.',
          ],
        },
        {
          eyebrow: 'Dominios',
          title: 'Rutas públicas',
          body: [
            'Los dominios son parte de la arquitectura. Los nombres de host nuevos al azar son justo la forma en que las plataformas se convierten en arqueología.',
          ],
          bullets: [
            '`tiko.mt`: inicio público de producto y marketing.',
            '`tikotalks.com`: la superficie pública de TikoTalks para documentación y marca, es decir, estas páginas.',
            '`*.tikoapps.org`: la familia de apps en ejecución, como yesno, type, cards, sequence, timer, media y admin.',
            '`id.tiko.mt`: origen de identidad basada en dispositivo (alias antiguo de `identity.tikoapi.org`).',
            '`*.tikoapi.org`: la familia de servicios de API: `identity`, `admin`, `app`, `communication`, `content`, `generation`, `media` y `translations` tienen su propio subdominio.',
            '`*.tikocdn.org`: solo entrega de bytes, sin lógica de aplicación.',
          ],
        },
      ],
    },
    'docs-apis': {
      label: 'API',
      title: 'Contratos de API',
      lede: 'Las API son la columna vertebral del producto. Permiten que los clientes web, iOS y Android se comporten igual sin copiar la lógica de backend en cada app.',
      summary: 'Una guía legible de las familias de contratos `/v1` actuales.',
      callouts: [
        { title: 'Versionado', body: 'Las API visibles para los clientes viven bajo `/v1` y devuelven JSON, salvo los endpoints que transmiten bytes.' },
        { title: 'Errores tipados', body: 'Los errores usan códigos estables legibles por máquina y mensajes seguros para personas.' },
        { title: 'Compatible con bearer', body: 'Los clientes nativos deben funcionar con sesiones bearer explícitas; las cookies del navegador no bastan.' },
      ],
      sections: [
        {
          eyebrow: 'Reglas comunes de API',
          title: 'Reglas de contrato',
          body: [
            'La forma de la API debe seguir siendo aburrida. Es un cumplido. Rutas predecibles y envoltorios de error constantes evitan que varios clientes se separen.',
          ],
          bullets: [
            'Usar rutas `/v1`.',
            'Devolver JSON desde las rutas de API; transmitir bytes solo desde rutas explícitas de medios o audio.',
            'Usar sesiones bearer para la paridad nativa.',
            'No revelar nunca si existe un correo de recuperación o un identificador.',
            'Guardar los tokens en bruto solo en el cliente; el servidor guarda hashes.',
            'No exponer a los clientes los cuerpos de error de los proveedores.',
          ],
        },
        {
          eyebrow: 'Identidad',
          title: 'API de identidad basada en dispositivo',
          body: [
            'La identidad existe para que las apps se abran de inmediato y aun así puedan recuperarse después. El bootstrap crea o restaura una sesión de dispositivo; la recuperación por correo mejora la continuidad sin convertir el arranque en un inicio de sesión.',
          ],
          bullets: [
            '`POST /v1/identity/device`: crear o restaurar una sesión basada en dispositivo.',
            '`GET /v1/identity/session`: validar y devolver el paquete de sesión actual.',
            '`POST /v1/identity/email/challenge`: pedir un desafío de recuperación por correo con respuesta genérica.',
            '`POST /v1/identity/email/verify`: verificar un token de enlace mágico o un OTP y devolver un paquete de identidad de Ankore.',
            '`POST /v1/identity/logout`: revocar la sesión bearer actual.',
          ],
        },
        {
          eyebrow: 'Datos de app',
          title: 'API de ajustes y estado',
          body: [
            'La API de app es dueña de los ajustes y el estado por usuario de las apps pequeñas de Tiko. Los ajustes son preferencias visibles para el cuidador. El estado son los datos propios de la app que merece la pena conservar entre dispositivos cuando la persistencia es intencionada.',
          ],
          bullets: [
            '`GET /v1/apps/{app}/settings`: leer los ajustes.',
            '`PUT /v1/apps/{app}/settings`: guardar los ajustes con soporte de versiones.',
            '`GET /v1/apps/{app}/state`: leer el estado de la app.',
            '`PUT /v1/apps/{app}/state`: guardar el estado de la app.',
            'Nombres de app P0 permitidos: `yes-no`, `type`, `cards`, `sequence`, `timer`.',
          ],
        },
        {
          eyebrow: 'Generación y medios',
          title: 'TTS, audio generado, subidas y registros de medios',
          body: [
            'La generación y los medios están relacionados pero no son lo mismo. La generación crea recursos. Los medios gestionan recursos subidos y sus metadatos. R2 guarda los bytes; D1 guarda la propiedad y los metadatos de búsqueda.',
          ],
          bullets: [
            '`POST /v1/generation/tts`: generar o recuperar de caché audio de texto a voz.',
            '`GET /v1/generation/audio/{id}`: transmitir los bytes de audio generado.',
            '`POST /v1/media/uploads`: autorizar y registrar una subida de medios.',
            '`GET /v1/media/{id}`: leer metadatos o detalles de acceso de un medio.',
            '`DELETE /v1/media/{id}`: futuro contrato de borrado cuando exista la experiencia de producto.',
          ],
        },
        {
          eyebrow: 'Contenido y administración',
          title: 'Contenido publicado y operaciones peligrosas',
          body: [
            'El contenido trata de modelos de lectura publicados, contenido de apps y registros tipo CMS. La administración está separada a propósito, porque las operaciones peligrosas nunca deben colarse en las API que usan los niños.',
          ],
          bullets: [
            '`content-api` es dueña del contenido publicado, la visibilidad de las apps, las versiones de contenido y los modelos de lectura cacheables.',
            '`admin-api` es dueña de la configuración de back-office, los informes, la moderación, las acciones de soporte y los registros de auditoría.',
            'Las claves o sesiones de la API de administración no pertenecen a los flujos que usan los niños.',
          ],
        },
      ],
    },
  },
}
