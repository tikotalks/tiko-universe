import type { SiteCopy } from '../..'

/** Política de privacidad en español. Los anclajes (`id`) no se traducen. */
export const esPrivacy: SiteCopy['privacy'] = {
  documentTitle: 'Política de privacidad',
  description: 'Cómo tratan los datos las apps de Tiko y tikotalks.com, en lenguaje claro.',
  eyebrow: 'Política de privacidad',
  title: 'Qué recogemos y qué no.',
  lede: 'Tiko hace apps tranquilas y accesibles para niños. La privacidad no es algo que se añade al final: forma parte del diseño. Esta política explica en lenguaje claro cómo tratan los datos las apps de Tiko y tikotalks.com.',
  lastUpdatedLabel: 'Última actualización',
  lastUpdated: 'junio de 2026',
  supportEmail: 'support@tikotalks.com',
  sections: [
    {
      id: 'promise',
      title: 'Nuestra promesa',
      bullets: [
        'Gratis, siempre. Nunca vendemos tus datos ni la atención de un niño a cambio de acceso.',
        'Sin publicidad. Nunca. En las apps de Tiko no hay publicidad, rastreo publicitario ni redes de anuncios de terceros.',
        'Sin muros de acceso. Las apps para niños se abren y funcionan sin cuenta.',
        'Recogemos lo mínimo posible, y solo lo que una app necesita de verdad para funcionar.',
      ],
    },
    {
      id: 'device-first',
      title: 'En el dispositivo por defecto',
      body: [
        'Las apps de Tiko están hechas para funcionar en el dispositivo. Tus ajustes, frases guardadas, borradores y contenido reciente se almacenan en local para que las apps sigan siendo rápidas y utilizables sin conexión. Si usas una app sin iniciar sesión, ese contenido se queda en tu dispositivo.',
      ],
    },
    {
      id: 'accounts',
      title: 'Cuentas y sincronización opcionales',
      body: [
        'Tiko usa identidad basada en el dispositivo en lugar de contraseñas. Si decides activar la recuperación para cuidadores o la sincronización entre dispositivos, podemos guardar una dirección de correo para enviarte un enlace de acceso y vincular tus dispositivos. Es siempre opcional y siempre transparente: la app del niño nunca empieza creando una cuenta.',
      ],
    },
    {
      id: 'speech',
      title: 'Voz y contenido',
      body: [
        'Algunas apps, como Tiko Type y Tiko Talk, pueden leer texto en voz alta. Para generar una voz natural, el texto que pides que se lea puede enviarse a nuestro servicio de voz y procesarse únicamente para devolver el audio. No usamos ese contenido para crear perfiles publicitarios y no lo vendemos.',
      ],
    },
    {
      id: 'what-we-do-not-do',
      title: 'Lo que no hacemos',
      bullets: [
        'No mostramos publicidad ni usamos rastreadores publicitarios.',
        'No vendemos ni alquilamos datos personales.',
        'No exigimos que un niño cree una cuenta ni comparta datos personales para usar una app.',
        'No hacemos afirmaciones médicas, diagnósticas ni terapéuticas, y no recogemos datos de salud con esos fines.',
      ],
    },
    {
      id: 'children',
      title: 'Privacidad de los niños',
      body: [
        'Las apps de Tiko están diseñadas para abrirse con tranquilidad al lado de un niño. Como funcionan sin cuentas y sin publicidad, un niño puede usarlas sin compartir información personal. Cuando un cuidador decide activar la recuperación opcional, esa información de cuenta pertenece al cuidador, no al niño.',
      ],
    },
    {
      id: 'retention',
      title: 'Conservación y eliminación',
      body: [
        'El contenido guardado en local permanece en el dispositivo hasta que lo borras o eliminas la app. Si has creado una cuenta opcional, puedes pedirnos en cualquier momento que la eliminemos junto con los datos asociados escribiendo a {email}.',
      ],
    },
    {
      id: 'changes',
      title: 'Cambios en esta política',
      body: [
        'Si cambiamos la forma de tratar los datos, actualizaremos esta página y revisaremos la fecha de arriba. Los cambios importantes se indicarán con claridad.',
      ],
    },
    {
      id: 'contact',
      title: 'Contacto',
      body: [
        '¿Dudas sobre privacidad o sobre tus datos? Escribe a {email} y te ayudará una persona de verdad.',
      ],
    },
  ],
}
