/**
 * Home page copy.
 *
 * The home page used to read its pillars, platform notes and trust principles
 * straight out of `siteContent.ts`, which is English-only by construction. The
 * prose lives here now; `siteContent.ts` keeps the artwork each block is paired
 * with, because a picture is not a translation.
 */
export const homeEn = {
  hero: {
    eyebrow: 'Education and Communication',
    title: 'Tiny apps for everyday moments',
    lede: 'Tiko is a collection of small, beautiful education and communication apps. Each one does one clear thing, opens in seconds, and speaks any language.',
    note: 'No ads · No account · Any language',
    primaryLabel: 'Explore the apps',
    secondaryLabel: 'Why Tiko',
  },

  whyTiko: {
    eyebrow: 'Why Tiko',
    // Rendered as `title` followed by `titleAccent` in italics.
    title: 'Small',
    titleAccent: 'on purpose.',
    intro: 'Each app stays focused so the moment stays calm — for the child and the adult beside them.',
    pillars: [
      {
        title: 'Open instantly. No setup.',
        body: 'Tiko apps are ready the moment you need them. No account form, no download, no tutorial — just open and use.',
      },
      {
        title: 'One app, one clear job.',
        body: 'Each Tiko app does exactly one thing. The screen stays simple, calm, and easy to trust — for the child and the adult beside them.',
      },
      {
        title: 'Every language, built in.',
        body: 'Tiko is multilingual from the ground up, not as an afterthought. Every app speaks the child’s language — because communication tools that only work in one language leave too many people out.',
      },
      {
        title: 'Free and ad-free, always.',
        body: 'No trial. No premium gate. No ads. No attention tracking. The tools work the same on day one as they do on day one thousand.',
      },
    ],
  },

  apps: {
    eyebrow: 'Education and Communication',
    title: 'One everyday moment.',
    titleAccent: 'One tiny app.',
    intro: 'Open the one that fits the moment.',
  },

  download: {
    eyebrow: 'Download',
    title: 'Get them on',
    titleAccent: 'the App Store.',
    intro: 'Five Tiko apps are on the App Store for iPhone and iPad, free and without an account. The rest run on the web today.',
  },

  caregivers: {
    eyebrow: 'For caregivers',
    title: 'Built so the first moment isn’t an account form.',
    imageAlt: 'A caregiver and child talking together',
    principles: [
      'Free, always.',
      'No ads. Ever.',
      'No passwords.',
      'No login walls before use.',
      'No child-facing account ceremony.',
      'No dark patterns or upgrade pressure in the child flow.',
      'Tiko does not make medical, diagnostic, or therapy-outcome claims.',
    ],
  },

  media: {
    eyebrow: 'From the Tiko library',
    title: 'Thousands of clear, colourful images.',
  },

  whyFree: {
    eyebrow: 'Why free',
    title: 'Free, and ad-free, always.',
    pillars: [
      {
        title: 'No hesitation.',
        body: 'Open a tool and try it with a child right now — without deciding whether the moment is worth paying for.',
      },
      {
        title: 'No pressure.',
        body: 'Tiko doesn’t use urgency, shame, ads, or upgrade prompts. Nothing turns communication into a transaction.',
      },
      {
        title: 'No hidden bargain.',
        body: 'Free doesn’t mean ad-funded. Tiko is not trading a child’s attention or data for access.',
      },
    ],
  },

  platforms: {
    eyebrow: 'One Tiko, many screens',
    title: 'Start on the web. Stay consistent everywhere.',
    notes: [
      {
        label: 'Web',
        body: 'The fastest way to try Tiko. A link is all it takes — no app store, no download required.',
      },
      {
        label: 'iOS',
        body: 'Yes No, Type, Say, Sum and First are on the App Store now, for iPhone and iPad. The rest follow the same calm, focused experience.',
      },
      {
        label: 'Android',
        body: 'Android follows the same approach — small tools, one job each, consistent behaviour.',
      },
    ],
  },

  cta: {
    title: 'Ready to try?',
    body: 'Open a Tiko app and use it with a child right now — no account, no download, no waiting room.',
    primaryLabel: 'Explore the apps',
    secondaryLabel: 'Open Yes No',
  },
} as const
