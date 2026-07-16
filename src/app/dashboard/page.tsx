'use client'

import { useMemo } from 'react'
import { HeatmapCalendar } from '@/components/dashboard/HeatmapCalendar'
import { ArrowLeft, Flame } from 'lucide-react'
import { useTimerStore } from '@/stores/timerStore'
import Link from 'next/link'
import type { DayStats, FocusSession } from '@/types'

function buildStatsFromSessions(sessions: FocusSession[]): DayStats[] {
    const dayMap = new Map<string, DayStats>()

    for (const session of sessions) {
        const localDate = new Date(session.startedAt)
        const date = `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`
        const existing = dayMap.get(date) || { date, totalMinutes: 0, sessionCount: 0 }
        existing.totalMinutes += Math.floor(session.actualDurationSeconds / 60)
        existing.sessionCount += 1
        dayMap.set(date, existing)
    }

    return Array.from(dayMap.values()).sort((a, b) => a.date.localeCompare(b.date))
}

function calculateStreak(sessions: DayStats[]): number {
    if (sessions.length === 0) return 0

    const sessionDates = new Set(sessions.filter(s => s.totalMinutes > 0).map(s => s.date))
    const now = new Date()
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

    let streak = 0
    let checkDate = new Date(now)

    // If today has no sessions, start from yesterday
    if (!sessionDates.has(today)) {
        checkDate.setDate(checkDate.getDate() - 1)
    }

    while (true) {
        const dateStr = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`
        if (sessionDates.has(dateStr)) {
            streak++
            checkDate.setDate(checkDate.getDate() - 1)
        } else {
            break
        }
    }

    return streak
}

export default function DashboardPage() {
    const dashboardAccent = useTimerStore((s) => s.settings.dashboardAccent) || '#8b5cf6'
    const pendingSessions = useTimerStore((s) => s.pendingSessions)
    const cloudSessions = useTimerStore((s) => s.cloudSessions)

    // Merge cloud sessions + local pending sessions (deduplicate by id)
    const allSessions = useMemo(() => {
        const sessionMap = new Map<string, FocusSession>()

        for (const session of cloudSessions) {
            sessionMap.set(session.id, session)
        }

        for (const session of pendingSessions) {
            if (!sessionMap.has(session.id)) {
                sessionMap.set(session.id, session)
            }
        }

        return Array.from(sessionMap.values())
    }, [cloudSessions, pendingSessions])

    const sessions = buildStatsFromSessions(allSessions)
    const streak = calculateStreak(sessions)

    return (
        <div className="min-h-screen bg-[#1A1B24] pt-16 px-4 pb-8">
            <div className="max-w-lg mx-auto space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/"
                            className="text-zinc-400 hover:text-white transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <h1 className="text-2xl font-bold text-white">Statistics</h1>
                    </div>
                </div>

                {streak > 0 && (
                    <div className="flex items-center gap-2 text-sm text-zinc-500">
                        <Flame className="h-4 w-4 text-orange-400/70" />
                        <span>{streak} day{streak !== 1 ? 's' : ''} streak</span>
                    </div>
                )}

                <div className="bg-zinc-800/30 rounded-xl p-5 border border-zinc-700/30 transform scale-110 origin-top">
                    <HeatmapCalendar sessions={sessions} accentColor={dashboardAccent} />
                </div>
            </div>
        </div>
    )
}
