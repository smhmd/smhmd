import type { AppID } from 'src/apps'
import { ArrowLeft, Github, LinkedIn, Twitter } from 'src/icons'
import { SOCIALS } from 'src/lib/env'
import type { SVGIcon } from 'src/lib/types'

import type { Sprite } from './voice'

type DialogueNode = {
  text: string // subtitles
  sprite?: Sprite // [start, end] of audio in seconds
  auto?: NodeId // jump to node auotmatically
  animations?: string[] // animations to play during node
  choices?: Choice[] // possible nodes
}

export type Choice = { text: string; icon?: SVGIcon } & (
  | { node: NodeId }
  | { app: AppID }
  | { href: string }
)

/** The standard way back. Same wording, same arrow, wherever it appears. */
const BACK: Choice = { text: 'Go back', node: 'open_question', icon: ArrowLeft }

export type NodeId =
  | 'greeting'
  | 'open_question'
  | 'contact_answer'
  | 'apps_answer'

export const OPENER = 'greeting' satisfies NodeId

export const dialogue: Record<NodeId, DialogueNode> = {
  greeting: {
    text: "Hey, I'm Simo. A software engineer from Morocco. Glad you stopped by.",
    sprite: [0, 6.8],
    auto: 'open_question',
    animations: ['shaking-hands'],
  },

  open_question: {
    text: 'What brings you to my website?',
    sprite: [6.8, 8.75],
    choices: [
      { text: "Show me what you've built.", node: 'apps_answer' },
      { text: "I wanna hire you. Let's connect!", node: 'contact_answer' },
    ],
    animations: [],
  },

  contact_answer: {
    text: 'Where would you like to connect?',
    sprite: [10.1, 11.6],
    choices: [
      { text: 'LinkedIn', href: SOCIALS.LinkedIn, icon: LinkedIn },
      { text: 'GitHub', href: SOCIALS.GitHub, icon: Github },
      { text: 'X (Twitter)', href: SOCIALS.Twitter, icon: Twitter },
      BACK,
    ],
    animations: ['talking-1'],
  },

  apps_answer: {
    text: 'What are you in the mood for? We have puzzles, music apps, classic games.',
    sprite: [12.95, 19.33],
    choices: [
      { text: "Let's play some music.", app: 'keylimba' },
      { text: 'Solving a puzzle will be fun.', app: 'monument-valley' },
      { text: 'A classic game.', app: '2048' },
      BACK,
    ],
    animations: ['talking-2'],
  },
}
