import { useEffect, useState } from 'react'

import { AnimatePresence, motion } from 'motion/react'

import { api } from '../lib'

const files = (e: DragEvent) => !!e.dataTransfer?.types.includes('Files')

/** Drop a model anywhere to open it; the window says it's listening while a file is over it. */
export function Drop() {
  const [over, setOver] = useState(false)

  useEffect(() => {
    // Enter and leave fire for every element crossed, so count them.
    let depth = 0
    function enter(e: DragEvent) {
      if (!files(e)) return
      depth++
      setOver(true)
    }
    function leave(e: DragEvent) {
      if (files(e) && --depth === 0) setOver(false)
    }
    function over(e: DragEvent) {
      if (files(e)) e.preventDefault()
    }
    function drop(e: DragEvent) {
      if (!files(e)) return
      e.preventDefault()
      depth = 0
      setOver(false)
      const file = e.dataTransfer!.files[0]
      if (file) void api.open(file)
    }
    const controller = new AbortController()
    const { signal } = controller
    window.addEventListener('dragenter', enter, { signal })
    window.addEventListener('dragleave', leave, { signal })
    window.addEventListener('dragover', over, { signal })
    window.addEventListener('drop', drop, { signal })
    return () => controller.abort()
  }, [])

  return (
    <AnimatePresence>
      {over && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className='pointer-events-none fixed inset-0 z-50 grid place-items-center bg-black/50 p-3 backdrop-blur-sm'>
          <div className='grid size-full place-content-center gap-1 rounded-2xl border-2 border-dashed border-white/30 text-center'>
            <p className='text-sm font-medium text-white'>Drop to Open</p>
            <p className='text-xs text-neutral-400'>
              GLB, OBJ, PLY, STL or Supervisely TAR
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
