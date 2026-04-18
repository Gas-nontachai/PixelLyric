import { useEffect, useState } from 'react'

export function useWaveform(file: File | null, bars = 120) {
    const [data, setData] = useState<number[]>([])
    const [isLoading, setIsLoading] = useState(false)

    useEffect(() => {
        if (!file) {
            setData([])
            setIsLoading(false)
            return
        }

        let isCancelled = false
        const audioCtx = new AudioContext()
        setData([])
        setIsLoading(true)

        const process = async () => {
            const arrayBuffer = await file.arrayBuffer()
            const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

            const raw = audioBuffer.getChannelData(0)
            const blockSize = Math.max(1, Math.floor(raw.length / bars))
            const waveform: number[] = []

            for (let i = 0; i < bars; i++) {
                const start = i * blockSize
                let sum = 0

                for (let j = 0; j < blockSize; j++) {
                    sum += Math.abs(raw[start + j] || 0)
                }

                waveform.push(sum / blockSize)
            }

            const max = Math.max(...waveform)
            const normalized = max > 0 ? waveform.map((v) => v / max) : waveform.map(() => 0)

            if (!isCancelled) {
                setData(normalized)
                setIsLoading(false)
            }
        }

        void process().catch(() => {
            if (!isCancelled) {
                setData([])
                setIsLoading(false)
            }
        })

        return () => {
            isCancelled = true
            void audioCtx.close().catch(() => {})
        }
    }, [file, bars])

    return {
        data,
        isLoading,
    }
}
