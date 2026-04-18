import { useEffect, useRef, useState } from 'react'

import type { ViewportMode } from '@/types'

export function getViewportMode(width: number): ViewportMode {
  if (width >= 1228) {
    return 'desktop'
  }

  if (width >= 768) {
    return 'tablet'
  }

  return 'mobile'
}

export function useViewportMode() {
  const initialViewportMode =
    typeof window === 'undefined' ? 'desktop' : getViewportMode(window.innerWidth)

  const [viewportMode, setViewportMode] = useState<ViewportMode>(initialViewportMode)
  const viewportModeRef = useRef(viewportMode)

  useEffect(() => {
    viewportModeRef.current = viewportMode
  }, [viewportMode])

  useEffect(() => {
    const handleResize = () => {
      const nextViewportMode = getViewportMode(window.innerWidth)

      if (nextViewportMode === viewportModeRef.current) {
        return
      }

      viewportModeRef.current = nextViewportMode
      setViewportMode(nextViewportMode)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    viewportMode,
    isMobile: viewportMode === 'mobile',
  }
}
