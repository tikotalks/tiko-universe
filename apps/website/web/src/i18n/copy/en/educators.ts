import type { ContentPage } from '../../content.model'

export const educatorsEn = {
  documentTitle: 'For educators and therapists',
  description:
    'Using Tiko across a class or caseload: separate profiles per child, no per-seat licence, nothing to install, and no data leaving the device.',
  eyebrow: 'For educators and therapists',
  title: 'Manage many children. Keep each experience calm.',
  lede: 'Tiko Profile Manager lets a teacher or therapist create a separate, lightweight profile for each child — and decide exactly what each one can reach. Children get a simple, focused tool. Adults keep the controls safely out of view.',

  sections: [
    {
      id: 'why-it-fits',
      eyebrow: 'In a classroom',
      title: 'Built for the twenty minutes you actually have.',
      body: [
        'Software that arrives in a school usually assumes someone has time to configure it. In practice the person holding the tablet has the few minutes between one lesson and the next, and a child who needs an answer now.',
        'Tiko is built for that reality. There is nothing to install on a managed device beyond opening a link, no licence key to chase through procurement, and no training day required before a tool is usable. If it does not suit your setting, you have lost a few minutes rather than a budget line.',
      ],
      points: [
        {
          title: 'No per-seat licence',
          body: 'Free for every child in your class or caseload. There is no headcount to report and no renewal to defend.',
        },
        {
          title: 'Nothing to deploy',
          body: 'The web apps run from a link on a managed device. Native apps are a normal App Store install.',
        },
        {
          title: 'No child accounts',
          body: 'Children never create logins or handle passwords, which keeps the tool outside most safeguarding review entirely.',
        },
        {
          title: 'Works on the network you have',
          body: 'Apps run offline after first use, so a filtered or unreliable school network does not stop a session.',
        },
      ],
    },
    {
      id: 'profiles',
      eyebrow: 'Many children',
      title: 'A separate profile for each child.',
      body: [
        'A caseload is not one user. Each child needs their own vocabulary, their own routines, and their own pictures — and none of them should see another child\'s.',
        'Profile Manager keeps those separate on the same device. You switch between them as an adult, and each child sees only their own content when they open an app. The adult controls sit behind the same caregiver-only flows used everywhere else in Tiko, so a curious child cannot wander into settings.',
      ],
      points: [
        {
          title: 'Per-child content',
          body: 'Cards, routines and saved phrases belong to a profile, not to the device.',
        },
        {
          title: 'Adult-only switching',
          body: 'Changing profile is a caregiver action. Children stay in the app they were given.',
        },
        {
          title: 'Shared device friendly',
          body: 'Built for the tablet that moves between children through the day, which is how most settings actually work.',
        },
        {
          title: 'No cross-child visibility',
          body: 'One child\'s vocabulary and history are never visible from another profile.',
        },
      ],
      tone: 'dark',
    },
    {
      id: 'alongside-practice',
      eyebrow: 'Alongside your practice',
      title: 'A tool in your hands, not a programme to follow.',
      body: [
        'Tiko has no built-in curriculum, no prescribed sequence, and no view about how a session should go. It does not score a child, chart them against a norm, or produce a report. Those judgements are yours, and the evidence you need for them comes from your own observation rather than an app\'s telemetry.',
        'What Tiko gives you is a set of dependable, low-friction tools to reach for during the work you already do: a way to offer a binary choice, build a sentence, hold attention on one step, or practise a word without a buzzer punishing a miss.',
      ],
    },
    {
      id: 'data',
      eyebrow: 'Data and safeguarding',
      title: 'The short version: it stays on the device.',
      body: [
        'Most Tiko apps send nothing anywhere. There is no analytics on child interactions, no advertising, and no third-party trackers. Speech recognition, where used, runs on the device wherever the platform allows and recordings are never stored.',
        'Because the apps are open source, your IT or safeguarding lead can verify that rather than rely on an assurance in a brochure. If your setting needs the detail written down, the privacy policy and the architecture docs are both public.',
      ],
    },
  ],

  cta: {
    title: 'Try it with one child first.',
    body: 'Pick a single app and one child this week. That is a fairer test than any evaluation matrix, and it costs nothing.',
    primaryLabel: 'Explore the apps',
    primaryPath: '/apps',
    secondaryLabel: 'Trust principles',
    secondaryPath: '/caregivers',
  },
} as const satisfies ContentPage
