import type { ContentPage } from '../../content.model'

export const whyTikoEn = {
  documentTitle: 'Why Tiko exists',
  description:
    'Why Tiko is a family of small, free, multilingual apps rather than one big communication platform — and why none of it costs anything.',
  eyebrow: 'Why Tiko exists',
  title: 'Fun, simple, and in every language.',
  lede: 'Tiko is a family of small, beautiful, free apps that help children communicate, choose, follow routines, and understand time. Every app opens in seconds, works in any language, and never asks for an account — because the first step should be using the tool, not setting it up.',

  sections: [
    {
      id: 'the-problem',
      eyebrow: 'The problem',
      title: 'Communication tools ask too much before they help.',
      body: [
        'A child who cannot yet say what they need is having a hard day right now — not after a trial, a licence, a training session, and a login. Yet most communication software asks for all four. It arrives as a platform: an account to create, a subscription to justify, a configuration screen to work through, and a manual to read before anyone gets a word out.',
        'That cost is not only money. It is the twenty minutes a teacher does not have between lessons, the confidence a parent loses when the first screen is an admin form, and the specialist device that stays in a cupboard because nobody is quite sure how to set it up. The tool ends up serving the institution that bought it rather than the child holding it.',
        'Tiko starts from the opposite end. The first screen is the tool. Everything else — settings, recovery, syncing across devices — is available afterwards, to the adult, and only if they want it.',
      ],
    },
    {
      id: 'small-apps',
      eyebrow: 'The shape',
      title: 'Many small apps, not one big one.',
      lede: 'Tiko is not a control panel with modes. It is a set of separate apps, each one doing a single job well.',
      body: [
        'A child learning to answer a question does not need a sentence builder on the same screen. A child following a morning routine does not need a keyboard. Every extra control is one more thing to misread, mis-tap, or be distracted by — and for a child who is already working hard to be understood, that cost is real.',
        'So each Tiko app is its own app. Yes No is two buttons. Type is a text field and a speak button. First is one step at a time. You open the one that fits the moment, and the screen contains almost nothing else.',
      ],
      points: [
        {
          title: 'One screen, one job',
          body: 'Each app opens directly on the thing it does. No home screen to navigate, no mode to choose first.',
        },
        {
          title: 'Learn it once',
          body: 'Because an app does one thing, a child can learn it completely. Confidence comes from a tool that behaves the same way every time.',
        },
        {
          title: 'Nothing to outgrow',
          body: 'Starting with Yes No does not lock anyone in. The apps are separate, so moving to Talk or Type is opening a different app, not migrating an account.',
        },
        {
          title: 'Small enough to trust',
          body: 'A tool a caregiver can understand in a minute is a tool they will actually reach for in a difficult moment.',
        },
      ],
    },
    {
      id: 'language',
      eyebrow: 'Language',
      title: 'Multilingual from the start, not translated later.',
      body: [
        'A communication tool that only works in one language leaves out the children who most need it: the child in a bilingual home, the child whose family language is not the language of their school, the child who has moved country and lost their words twice over.',
        'Tiko speaks the child\'s language rather than the developer\'s. Interface, spoken output and content are all translatable, and the language a caregiver picks follows them across every Tiko app and this website. Where a language has no interface translation yet, the app falls back to English for those words instead of refusing to open.',
      ],
    },
    {
      id: 'why-free',
      eyebrow: 'Why free',
      title: 'Because access should not have a price tag.',
      lede: 'Tiko\'s apps are free, always. Not a trial, not a teaser, not an upgrade funnel.',
      body: [
        'Communication is not a premium feature. A child should be able to open a Tiko app right now, without an adult first deciding whether this particular moment is worth paying for — because that decision, made under pressure, is usually made against the child.',
      ],
      points: [
        {
          title: 'No hesitation',
          body: 'Try a tool with a child immediately, without weighing up whether the moment justifies the cost.',
        },
        {
          title: 'No pressure',
          body: 'No urgency, no shame, no ads, no upgrade prompts. Nothing turns being understood into a transaction.',
        },
        {
          title: 'No hidden bargain',
          body: 'Free does not mean ad-funded. Tiko is not trading a child\'s attention or data for access — there is nothing to trade, because nothing is collected.',
        },
      ],
      tone: 'primary',
    },
    {
      id: 'not-therapy',
      eyebrow: 'What Tiko is not',
      title: 'A tool, not a treatment.',
      body: [
        'Tiko does not diagnose, treat, or promise outcomes. It is not a therapy programme, an assessment, or a substitute for a speech and language therapist. There are no scores, no progress dashboards, and no reports comparing one child against another.',
        'What Tiko offers is a good tool for a specific moment: a way to answer, to choose, to say a sentence, to follow a routine. Therapists and teachers use it alongside their own work, and families use it in the ordinary hours between appointments. That is deliberately a smaller claim than most software in this space makes.',
      ],
    },
    {
      id: 'professionals',
      eyebrow: 'Who shapes it',
      title: 'Built with therapists, not just for them.',
      lede: 'Speech and language therapists, teachers and other professionals review Tiko and tell us what is wrong with it.',
      body: [
        'A developer can build a communication tool that works. Whether it works for a child who is struggling to be understood is a different question entirely, and it is not one that gets answered by reading documentation. It gets answered by the people who sit with those children every week.',
        'So the apps get looked at by speech and language therapists, special-education teachers and other professionals — and their feedback changes them. Some of it is small: a target that is too close to another, a word that is wrong in a particular dialect, a celebration that is too stimulating for the children they work with. Some of it is not: the reason Say has no wrong-answer buzzer, and the reason no Tiko app keeps a score, both came from that direction.',
        'This is not a clinical endorsement and Tiko does not claim one. It is design review by people whose judgement is worth more than ours on the questions that matter most, and it is the reason several of the apps look the way they do rather than the way they started.',
      ],
      points: [
        {
          title: 'Reviewed from a therapy perspective',
          body: 'Professionals look at the apps with the children they support in mind, and say plainly where something would get in the way.',
        },
        {
          title: 'Feedback that changes the product',
          body: 'When a review says a pattern is wrong for these children, the pattern changes. Removed buzzers and absent scores both came from that.',
        },
        {
          title: 'Still not a treatment',
          body: 'Professional input makes Tiko better designed. It does not make it a therapy programme, and we do not present it as one.',
        },
      ],
      tone: 'secondary',
    },
    {
      id: 'open-source',
      eyebrow: 'Open by default',
      title: 'Built in the open, shaped by the people using it.',
      body: [
        'Tiko is open source. The code, the content contracts and the API shapes are public, so a school district, a therapist or a developer can see exactly what an app does with a child\'s data — which for most Tiko apps is nothing at all.',
        'It also means the direction comes from the people who use it. Parents, therapists and teachers report what is missing far more accurately than a roadmap written in isolation, and an open project can act on that without waiting for a commercial case.',
      ],
    },
  ],

  cta: {
    title: 'Open one and see.',
    body: 'The fastest way to judge Tiko is to use it with a child for two minutes. No account, no download, no waiting room.',
    primaryLabel: 'Explore the apps',
    primaryPath: '/apps',
    secondaryLabel: 'How it works',
    secondaryPath: '/how-it-works',
  },
} as const satisfies ContentPage
