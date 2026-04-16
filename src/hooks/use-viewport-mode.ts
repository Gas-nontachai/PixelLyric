import { useEffect, useRef, useState } from 'react'

export type ViewportMode = 'mobile' | 'tablet' | 'desktop'

export function getViewportMode(width: number): ViewportMode {
  if (width >= 1100) {
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
