import { PanTool } from 'src/icons'

import * as editor from '../editor'
import { MOD_LABEL } from '../platform'

export const tool: editor.Tool = {
  id: 'move',
  label: 'Move',
  Icon: PanTool,
  key: 'v',
  hint: {
    mouse: `Drag to orbit · scroll to zoom · right-drag to pan · hold ${MOD_LABEL} with any tool`,
    touch: 'Drag to orbit · pinch to zoom',
  },
}
