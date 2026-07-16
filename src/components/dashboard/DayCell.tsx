'use client'

import { cn } from '@/lib/utils'
import { getHeatmapIntensity } from '@/types'

interface DayCellProps {
    day: number | null
    totalMinutes: number
    isToday?: boolean
    intensityColors: string[]
}

function formatHoursMinutes(totalMinutes: number): string {
    if (totalMinutes === 0) return ''
    const h = Math.floor(totalMinutes / 60)
    const m = totalMinutes % 60
    return `${h}:${String(m).padStart(2, '0')}`
}


export function DayCell({ day, totalMinutes, isToday, intensityColors }: DayCellProps) {
    if (day === null) {
        return <div className="h-[58px]" />
    }

    const intensity = getHeatmapIntensity(totalMinutes)
    const timeDisplay = formatHoursMinutes(totalMinutes)
    const bgColor = intensity === 0 ? 'rgba(255,255,255,0.06)' : intensityColors[intensity]

    return (
        <div
            className={cn(
                'h-[58px] rounded-[4px] flex flex-col items-center justify-center gap-0.5 transition-colors duration-200',
                isToday && 'ring-[1.5px] ring-white/60'
            )}
            style={{ backgroundColor: bgColor }}
        >
            <span
                className={cn(
                    'text-[12px] font-medium tabular-nums leading-tight',
                    intensity === 0 ? 'text-zinc-500' : 'text-white/70'
                )}
            >
                {day}
            </span>
            <span className={cn(
                'text-[12px] tabular-nums leading-tight font-semibold',
                timeDisplay ? 'text-white/80' : 'invisible'
            )}>
                {timeDisplay || '0:00'}
            </span>
        </div>
    )
}
