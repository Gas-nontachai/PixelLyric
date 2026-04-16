import { useEffect, useState } from 'react'

import type { ViewportMode } from '@/types'

function getDefaultEditorOpen(viewportMode: ViewportMode) {
  return viewportMode === 'desktop'
}

export function useResponsiveEditorDock(viewportMode: ViewportMode) {
  const [isEditorOpen, setIsEditorOpen] = useState(() => getDefaultEditorOpen(viewportMode))

  useEffect(() => {
    setIsEditorOpen(getDefaultEditorOpen(viewportMode))
  }, [viewportMode])

  return {
    isEditorOpen,
    toggleEditor: () => setIsEditorOpen((currentValue) => !currentValue),
  }
}
