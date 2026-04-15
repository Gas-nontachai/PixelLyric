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
    description: 'โครงสร้างหลักของหน้าและ type safety พร้อมสำหรับ component-driven development',
  },
  {
    group: 'Build Tool',
    name: 'Vite',
    description: 'dev server เร็ว, HMR ลื่น และ build pipeline เรียบง่ายสำหรับ scale ต่อ',
  },
  {
    group: 'UI / Styling',
    name: 'Tailwind CSS',
    description: 'utility-first styling ที่วาง theme token และ design language กลางของโปรเจกต์ไว้แล้ว',
  },
  {
    group: 'Component System',
    name: 'shadcn/ui style',
    description: 'copy component มาใช้และ custom เองได้ผ่าน `src/components/ui` โดยไม่ล็อกกับ package',
  },
  {
    group: 'State',
    name: 'Zustand',
    description: 'เริ่มต้น store แบบเบา ๆ สำหรับ shared state และค่อยแตก slice ตาม feature ได้',
  },
]

export const useAppStore = create<AppState>((set) => ({
  count: 3,
  stack,
  increment: () => set((state) => ({ count: state.count + 1 })),
  reset: () => set({ count: 0 }),
}))
