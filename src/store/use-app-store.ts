import { create } from 'zustand'

type StackItem = {
  group: string
  name: string
  description: string
}

type AppState = {
  count: number
  stack: StackItem[]
  increment: () => void
  reset: () => void
}

const stack: StackItem[] = [
  {
    group: 'Core',
    name: 'React + TypeScript',
    description: 'Core app structure with type safety, ready for component-driven development.',
  },
  {
    group: 'Build Tool',
    name: 'Vite',
    description: 'Fast dev server, smooth HMR, and a simple build pipeline that can scale with the project.',
  },
  {
    group: 'UI / Styling',
    name: 'Tailwind CSS',
    description: 'Utility-first styling with shared theme tokens and a clear design language already in place.',
  },
  {
    group: 'Component System',
    name: 'shadcn/ui style',
    description: 'Copy and customize components from `src/components/ui` without being locked to a package.',
  },
  {
    group: 'State',
    name: 'Zustand',
    description: 'A lightweight shared-state store that can grow into feature-based slices later.',
  },
]

export const useAppStore = create<AppState>((set) => ({
  count: 3,
  stack,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}))
