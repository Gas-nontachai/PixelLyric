import type { MouseEvent } from 'react'

type WaveformProps = {
    data: number[]
    selectionStartPercent: number
    selectionEndPercent: number
    currentPercent: number
    onSeek?: (percent: number) => void
}

export function Waveform({
    data,
    selectionStartPercent,
    selectionEndPercent,
    currentPercent,
    onSeek,
}: WaveformProps) {
    const handleClick = (event: MouseEvent<HTMLDivElement>) => {
        if (!onSeek) {
            return
        }

        const bounds = event.currentTarget.getBoundingClientRect()
        const ratio = bounds.width <= 0 ? 0 : (event.clientX - bounds.left) / bounds.width
        const nextPercent = Math.min(100, Math.max(0, ratio * 100))

        onSeek(nextPercent)
    }

    return (
        <div className="waveform-wrapper" onClick={handleClick}>
            <div className="waveform">
                {data.map((v, i) => (
                    <div
                        key={i}
                        className="wave-bar"
                        style={{ height: `${v * 100}%` }}
                    />
                ))}
            </div>

            <div
                className="wave-selection"
                style={{
                    left: `${selectionStartPercent}%`,
                    width: `${Math.max(
                        0,
                        selectionEndPercent - selectionStartPercent
                    )}%`,
                }}
            />

            <div
                className="wave-playhead"
                style={{ left: `${Math.min(100, Math.max(0, currentPercent))}%` }}
            />
        </div>
    )
}