import { metadata as _2048 } from './2048/metadata'
import { metadata as _3dSegmenter } from './3d-segmenter/metadata'
import { metadata as aboutMe } from './about-me/metadata'
import { metadata as diceRoll } from './dice-roll/metadata'
import { metadata as keylimba } from './keylimba/metadata'
import { metadata as magnetize } from './magnetize/metadata'
import { metadata as monumentValley } from './monument-valley/metadata'
import { metadata as musicWorkstation } from './music-workstation/metadata'
import { metadata as spinningTops } from './spinning-tops/metadata'

export const apps = {
  'about-me': aboutMe,
  '2048': _2048,
  'dice-roll': diceRoll,
  keylimba,
  magnetize,
  'monument-valley': monumentValley,
  '3d-segmenter': _3dSegmenter,
  'spinning-tops': spinningTops,
  'music-workstation': musicWorkstation,
}

export type AppID = keyof typeof apps
export type AppGridArray = Array<AppID | [string, AppID[]]>

export const appIDs: AppID[] = [
  'about-me',
  'monument-valley',
  'keylimba',
  '2048',
  'dice-roll',
  'magnetize',
  'spinning-tops',
  'music-workstation',
  '3d-segmenter',
]

export const appGrid: AppGridArray = appIDs
