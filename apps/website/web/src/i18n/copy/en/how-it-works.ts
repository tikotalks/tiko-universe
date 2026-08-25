import type { ContentPage } from '../../content.model'

export const howItWorksEn = {
  documentTitle: 'How Tiko works',
  description:
    'How Tiko apps open without an account, what happens on the device, and how optional caregiver recovery works.',
  eyebrow: 'How Tiko works',
  title: 'Open first. Setup stays in the background.',
  lede: 'Tiko starts device-first. Apps open and work immediately. Caregiver recovery can come later through an email magic link — never before the child gets to use the tool.',

  sections: [
    {
      id: 'first-two-minutes',
      eyebrow: 'The experience',
      title: 'Three moments, no friction.',
      steps: [
        {
          title: 'Open the link',
          body: 'A caregiver shares a link or bookmarks a Tiko app, or installs it from the App Store. There is nothing to license and nobody to ask.',
        },
        {
          title: 'Use it immediately',
          body: 'The app is ready with no sign-in, no tutorial and no onboarding flow. The child sees the tool itself, straight away.',
        },
        {
          title: 'Recover later, if you want',
          body: 'If a caregiver wants settings to follow them to another device, they add an email and confirm it once. That is optional, it happens after the fact, and the child never sees it.',
        },
      ],
    },
    {
      id: 'device-first',
      eyebrow: 'Device-first identity',
      title: 'No passwords, ever.',
      body: [
        'Every Tiko app creates a device session the first time it opens. It is generated locally, it belongs to that device, and it is enough to use everything the app does. No email address, no password, no account.',
        'This is the part most communication software gets backwards. An account exists to let a company recognise you across devices — a real need, but an adult one, and it is usually placed in front of the child as the price of entry. Tiko treats it as what it is: an optional convenience for the caregiver, offered later.',
      ],
      points: [
        {
          title: 'Device session',
          body: 'Created automatically on first open, stored locally, and never requires a login.',
        },
        {
          title: 'Magic link recovery',
          body: 'Optional. A caregiver adds an email and confirms it once to enable syncing across devices.',
        },
        {
          title: 'No child-facing ceremony',
          body: 'Recovery and admin flows are caregiver-only. A child is never shown an account form.',
        },
        {
          title: 'Consistent across platforms',
          body: 'Sessions work the same way on web, iOS and Android, so an app behaves identically wherever it runs.',
        },
      ],
      tone: 'dark',
    },
    {
      id: 'offline',
      eyebrow: 'Reliability',
      title: 'It keeps working when the network does not.',
      body: [
        'Tiko apps load their core content to the device and run from there. A dropped connection, a school network that blocks half the internet, or a car journey with no signal does not take away a child\'s ability to answer a question.',
        'Anything that genuinely needs the network — syncing settings across devices, downloading a new picture set — is additive. If it fails, the app carries on doing what it did before.',
      ],
    },
    {
      id: 'privacy',
      eyebrow: 'What is collected',
      title: 'Almost nothing, and never from the child.',
      body: [
        'Most Tiko apps collect nothing at all. There are no analytics tracking a child\'s taps, no advertising identifiers, and no third-party trackers. Speech recognition, where an app uses it, runs on the device wherever the platform supports it, and recordings are never stored or uploaded.',
        'Where an app does store something — a caregiver\'s custom cards, a routine they built, a saved phrase — it is content the adult created deliberately, and it stays on the device unless they turn on syncing.',
      ],
      points: [
        {
          title: 'No ads, ever',
          body: 'No advertising, no ad networks, and no tracking for advertising in any Tiko app.',
        },
        {
          title: 'No login wall',
          body: 'The child-facing apps open and work without an account of any kind.',
        },
        {
          title: 'On-device where possible',
          body: 'Speech recognition uses the platform\'s on-device engine where it exists. Recordings are not kept.',
        },
        {
          title: 'Readable in the open',
          body: 'The apps are open source, so the claims on this page can be checked rather than taken on trust.',
        },
      ],
    },
    {
      id: 'platforms',
      eyebrow: 'One Tiko, many screens',
      title: 'The same experience, everywhere.',
      body: [
        'The web is the fastest way to try Tiko: a link is all it takes. Native apps add what a browser cannot do as well — offline reliability, a home-screen icon a child recognises, and better speech support.',
        'Whichever you use, the app behaves the same way. The same contracts sit underneath all of them, so a routine built on a tablet is the same routine on a phone.',
      ],
    },
  ],

  cta: {
    title: 'Want the technical detail?',
    body: 'The architecture and API documentation covers how the workers, storage and clients fit together.',
    primaryLabel: 'Architecture docs',
    primaryPath: '/docs/architecture',
    secondaryLabel: 'API contracts',
    secondaryPath: '/docs/apis',
  },
} as const satisfies ContentPage
