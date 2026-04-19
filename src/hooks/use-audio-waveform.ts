import { useEffect, useState } from 'react'

import { getCachedWaveform, getWaveformCacheKey, saveCachedWaveform } from '@/lib/project-storage'

const waveformMemoryCache = new Map<string, number[]>()
const waveformRequestCache = new Map<string, Promise<number[]>>()

function getWaveformRequestKey(file: File, bars: number) {
  return `${getWaveformCacheKey(file)}::${bars}`
}

async function generateWaveform(file: File, bars: number) {
  const audioCtx = new AudioContext()

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

    return max > 0 ? waveform.map((value) => value / max) : waveform.map(() => 0)
  } finally {
    void audioCtx.close().catch(() => {})
  }
}

async function loadWaveform(file: File, bars: number) {
  const cacheKey = getWaveformCacheKey(file)
  const requestKey = getWaveformRequestKey(file, bars)
  const memoryHit = waveformMemoryCache.get(requestKey)

  if (memoryHit) {
    return memoryHit
  }

  const inFlightRequest = waveformRequestCache.get(requestKey)

  if (inFlightRequest) {
    return inFlightRequest
  }

  const request = (async () => {
    const cachedWaveform = await getCachedWaveform(cacheKey, bars)

    if (cachedWaveform) {
      waveformMemoryCache.set(requestKey, cachedWaveform)
      return cachedWaveform
    }

    const normalizedWaveform = await generateWaveform(file, bars)
    waveformMemoryCache.set(requestKey, normalizedWaveform)
    await saveCachedWaveform(cacheKey, bars, normalizedWaveform)

    return normalizedWaveform
  })()

  waveformRequestCache.set(requestKey, request)

  try {
    return await request
  } finally {
    waveformRequestCache.delete(requestKey)
  }
}

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

    const process = async () => {
      setData([])
      setIsLoading(true)

      try {
        const waveform = await loadWaveform(file, bars)

        if (!isCancelled) {
          setData(waveform)
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
