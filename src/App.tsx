import { Sparkles, WandSparkles, Waves } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAppStore } from '@/store/use-app-store'

function App() {
  const count = useAppStore((state) => state.count)
  const increment = useAppStore((state) => state.increment)
  const reset = useAppStore((state) => state.reset)
  const stack = useAppStore((state) => state.stack)

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,#f8f0de_0%,#f3ead8_28%,#efe1ca_55%,#ead8bc_100%)] text-foreground">
      <div className="absolute inset-x-0 top-0 h-80 bg-[linear-gradient(180deg,rgba(196,106,28,0.14),transparent)]" />
      <div className="absolute -left-24 top-24 h-64 w-64 rounded-full bg-[rgba(211,129,55,0.2)] blur-3xl" />
      <div className="absolute right-0 top-16 h-72 w-72 rounded-full bg-[rgba(64,103,92,0.18)] blur-3xl" />

      <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10 lg:px-10">
        <header className="mb-10 flex flex-col gap-4 border-b border-border/70 pb-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-4">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/80 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" />
              PixelLyric Starter
            </span>
            <div className="space-y-3">
              <h1 className="font-display text-5xl leading-none tracking-[-0.06em] text-foreground sm:text-6xl">
                React stack ที่พร้อมแต่งต่อเองได้ทันที
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                วางแกนหลักให้ครบแล้ว: Vite, Tailwind CSS, โครงแบบ shadcn/ui,
                และ Zustand store พร้อม component ที่ custom ต่อได้ตาม flow งานของคุณ.
              </p>
            </div>
          </div>

          <Card className="w-full max-w-sm border-border/80 bg-card/85 shadow-lg backdrop-blur">
            <CardHeader className="pb-4">
              <CardDescription>State Demo</CardDescription>
              <CardTitle className="text-4xl">{count}</CardTitle>
            </CardHeader>
            <CardContent className="flex gap-3">
              <Button onClick={increment} className="flex-1">
                เพิ่ม counter
              </Button>
              <Button variant="secondary" onClick={reset} className="flex-1">
                รีเซ็ต
              </Button>
            </CardContent>
          </Card>
        </header>

        <section className="grid gap-5 lg:grid-cols-[1.35fr_0.95fr]">
          <Card className="border-border/80 bg-card/80 shadow-xl backdrop-blur">
            <CardHeader>
              <CardDescription>Configured Stack</CardDescription>
              <CardTitle className="flex items-center gap-3 text-2xl">
                <WandSparkles className="size-5 text-primary" />
                Base project structure
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              {stack.map((item) => (
                <div
                  key={item.name}
                  className="rounded-2xl border border-border/80 bg-background/70 p-4 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
                    {item.group}
                  </p>
                  <h2 className="mt-2 text-xl font-semibold text-foreground">{item.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {item.description}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-[#17352f] text-white shadow-xl">
            <CardHeader>
              <CardDescription className="text-white/70">What’s ready</CardDescription>
              <CardTitle className="flex items-center gap-3 text-2xl text-white">
                <Waves className="size-5 text-[#f6d089]" />
                shadcn-style setup
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-white/82">
              <p>
                มี `Button`, `Card`, utility `cn()` และ alias `@/*` ให้เรียกใช้ component
                แบบ copy-and-custom ได้เลย โดยไม่ผูกกับ generator.
              </p>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-4">
                <p className="font-mono text-xs text-white/65">
                  src/components/ui
                </p>
                <p className="mt-2 font-mono text-sm text-[#f9e6c0]">
                  button.tsx
                  <br />
                  card.tsx
                  <br />
                  lib/utils.ts
                  <br />
                  store/use-app-store.ts
                </p>
              </div>
              <Button
                variant="outline"
                className="border-white/20 bg-white/8 text-white hover:bg-white/14 hover:text-white"
              >
                พร้อมต่อ feature จริง
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
  )
}

export default App
