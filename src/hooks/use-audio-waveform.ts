import { useEffect, useState } from 'react'

export function useWaveform(file: File | null, bars = 120) {
    const [data, setData] = useState<number[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!file) {
            return
        }

        let isCancelled = false
        const audioCtx = new AudioContext()

        const process = async () => {
            setData([])
            setIsLoading(true)

            try {
                const arrayBuffer = await file.arrayBuffer()
                const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

                const raw = audioBuffer.getChannelData(0)
                const blockSize = Math.max(1, Math.floor(raw.length / bars))
                const waveform: number[] = []

                for (let index = 0; index < bars; index += 1) {
                    const start = index * blockSize
                    let sum = 0

                    for (let sampleIndex = 0; sampleIndex < blockSize; sampleIndex += 1) {
                        sum += Math.abs(raw[start + sampleIndex] || 0)
                    }

                    waveform.push(sum / blockSize)
                }

                const max = Math.max(...waveform)
                const normalized = max > 0 ? waveform.map((value) => value / max) : waveform.map(() => 0)

                if (!isCancelled) {
                    setData(normalized)
                    setIsLoading(false)
                }
            } catch {
                if (!isCancelled) {
                    setData([])
                    setIsLoading(false)
                }
            }
        }

        void process()

        return () => {
            isCancelled = true
            void audioCtx.close().catch(() => {})
        }
    }, [file, bars])

    if (!file) {
        return {
            data: [],
            isLoading: false,
        }
    }

    return {
        data,
        isLoading,
    }
}
