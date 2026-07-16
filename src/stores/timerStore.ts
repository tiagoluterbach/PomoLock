import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
    type TimerMode,
    type TimerStatus,
    type AppSettings,
    type FocusSession,
    DEFAULT_SETTINGS,
} from '@/types'

// Unique ID generator that works in both browser and test environments
function generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID()
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
}

// ==========================================
// Timer Store Types
// ==========================================

interface TimerState {
    // Timer state
    mode: TimerMode
    status: TimerStatus
    secondsRemaining: number
    hyperfocusSeconds: number
    completedPomodoros: number
    lastPomodoroDate: string | null  // YYYY-MM-DD local date
    sessionStartedAt: string | null
    hyperfocusEnabled: boolean
    pausedFromHyperfocus: boolean

    // Settings
    settings: AppSettings

    // Sync
    pendingSessions: FocusSession[]
    cloudSessions: FocusSession[]

    // Actions
    setMode: (mode: TimerMode) => void
    start: () => void
    pause: () => void
    reset: () => void
    skip: () => void
    complete: () => void
    tick: () => void
    tickHyperfocus: () => void
    enterHyperfocus: () => void
    exitHyperfocus: () => void
    toggleHyperfocus: () => void
    updateSettings: (settings: Partial<AppSettings>) => void
    setSecondsRemaining: (seconds: number) => void
    resetStats: () => void

    // Sync actions
    addPendingSession: (session: FocusSession) => void
    removeSyncedSessions: (ids: string[]) => void
    replaceSettings: (settings: AppSettings) => void
    setCloudSessions: (sessions: FocusSession[]) => void
}

// ==========================================
// Helper Functions
// ==========================================

export function getDurationForMode(mode: TimerMode, settings: AppSettings): number {
    switch (mode) {
        case 'focus':
            return settings.focusDuration * 60
        case 'shortBreak':
            return settings.shortBreakDuration * 60
        case 'longBreak':
            return settings.longBreakDuration * 60
    }
}

export function getNextMode(
    currentMode: TimerMode,
    completedPomodoros: number,
    settings: AppSettings
): TimerMode {
    if (currentMode === 'focus') {
        const nextPomodoros = completedPomodoros + 1
        if (nextPomodoros % settings.pomodorosUntilLongBreak === 0) {
            return 'longBreak'
        }
        return 'shortBreak'
    }
    return 'focus'
}

function getLocalDateString(): string {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}

// Helper to get the correct pomodoro count, resetting if the day changed
function getDailyPomodoros(completedPomodoros: number, lastPomodoroDate: string | null): number {
    const today = getLocalDateString()
    if (lastPomodoroDate !== today) {
        return 0 // Day changed, reset
    }
    return completedPomodoros
}

// ==========================================
// Timer Store
// ==========================================

export const useTimerStore = create<TimerState>()(
    persist(
        (set, get) => ({
            // Initial state
            mode: 'focus',
            status: 'idle',
            secondsRemaining: DEFAULT_SETTINGS.focusDuration * 60,
            hyperfocusSeconds: 0,
            completedPomodoros: 0,
            lastPomodoroDate: null,
            sessionStartedAt: null,
            hyperfocusEnabled: false,
            pausedFromHyperfocus: false,

            // Settings
            settings: DEFAULT_SETTINGS,

            // Sync
            pendingSessions: [],
            cloudSessions: [],

            // Actions
            setMode: (mode) => {
                const { settings, mode: currentMode, status, secondsRemaining, hyperfocusSeconds, sessionStartedAt } = get()

                // Save partial session if switching away from an active focus mode
                if (currentMode === 'focus' && (status === 'running' || status === 'paused' || status === 'hyperfocus') && sessionStartedAt) {
                    const totalSeconds = getDurationForMode('focus', settings)
                    const elapsedSeconds = totalSeconds - secondsRemaining + hyperfocusSeconds
                    const elapsedMinutes = Math.floor(elapsedSeconds / 60)

                    // Only save if at least 1 minute was studied
                    if (elapsedMinutes >= 1) {
                        const now = new Date().toISOString()
                        const session: FocusSession = {
                            id: generateId(),
                            userId: '',
                            startedAt: sessionStartedAt,
                            durationMinutes: elapsedMinutes,
                            actualDurationSeconds: elapsedSeconds,
                            hyperfocusSeconds: hyperfocusSeconds,
                            completed: false,
                            createdAt: now,
                        }
                        const { pendingSessions } = get()
                        set({ pendingSessions: [...pendingSessions, session] })
                    }
                }

                set({
                    mode,
                    status: 'idle',
                    secondsRemaining: getDurationForMode(mode, settings),
                    hyperfocusSeconds: 0,
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                })
            },

            start: () => {
                const { status, sessionStartedAt, pausedFromHyperfocus } = get()
                if (pausedFromHyperfocus) {
                    // Resume hyperfocus counting
                    set({ status: 'hyperfocus', pausedFromHyperfocus: false })
                } else {
                    set({
                        status: 'running',
                        sessionStartedAt:
                            status === 'idle'
                                ? new Date().toISOString()
                                : sessionStartedAt,
                    })
                }
            },

            pause: () => {
                const { status } = get()
                set({
                    status: 'paused',
                    pausedFromHyperfocus: status === 'hyperfocus',
                })
            },

            reset: () => {
                const { mode, settings, status, secondsRemaining, hyperfocusSeconds, sessionStartedAt } = get()
                
                // Save partial session if resetting during a focus mode
                if (mode === 'focus' && (status === 'running' || status === 'paused' || status === 'hyperfocus') && sessionStartedAt) {
                    const totalSeconds = getDurationForMode('focus', settings)
                    const elapsedSeconds = totalSeconds - secondsRemaining + hyperfocusSeconds
                    const elapsedMinutes = Math.floor(elapsedSeconds / 60)
                    
                    // Only save if at least 1 minute was studied
                    if (elapsedMinutes >= 1) {
                        const now = new Date().toISOString()
                        const session: FocusSession = {
                            id: crypto.randomUUID(),
                            userId: '',
                            startedAt: sessionStartedAt,
                            durationMinutes: elapsedMinutes,
                            actualDurationSeconds: elapsedSeconds,
                            hyperfocusSeconds: hyperfocusSeconds,
                            completed: false,
                            createdAt: now,
                        }
                        const { pendingSessions } = get()
                        set({ pendingSessions: [...pendingSessions, session] })
                    }
                }
                
                set({
                    status: 'idle',
                    secondsRemaining: getDurationForMode(mode, settings),
                    hyperfocusSeconds: 0,
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                })
            },

            skip: () => {
                const { mode, completedPomodoros, settings, sessionStartedAt, lastPomodoroDate } = get()
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                const newPomodoros =
                    mode === 'focus' ? dailyPomodoros + 1 : dailyPomodoros

                // Save full session if skipping a focus mode
                if (mode === 'focus' && sessionStartedAt) {
                    const { hyperfocusSeconds, secondsRemaining } = get()
                    const now = new Date().toISOString()
                    const totalDuration = settings.focusDuration * 60
                    const elapsedSeconds = totalDuration - secondsRemaining + hyperfocusSeconds
                    const session: FocusSession = {
                        id: crypto.randomUUID(),
                        userId: '',
                        startedAt: sessionStartedAt,
                        durationMinutes: Math.floor(elapsedSeconds / 60),
                        actualDurationSeconds: elapsedSeconds,
                        hyperfocusSeconds: hyperfocusSeconds,
                        completed: false,
                        createdAt: now,
                    }
                    const { pendingSessions } = get()
                    set({ pendingSessions: [...pendingSessions, session] })
                }

                set({
                    mode: nextMode,
                    status: 'idle',
                    secondsRemaining: getDurationForMode(nextMode, settings),
                    hyperfocusSeconds: 0,
                    completedPomodoros: newPomodoros,
                    lastPomodoroDate: getLocalDateString(),
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                })
            },

            complete: () => {
                const { mode, completedPomodoros, settings, sessionStartedAt, lastPomodoroDate, hyperfocusSeconds, secondsRemaining } = get()
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                const newPomodoros = mode === 'focus' ? dailyPomodoros + 1 : dailyPomodoros

                // Save completed session if focus mode
                if (mode === 'focus' && sessionStartedAt) {
                    const now = new Date().toISOString()
                    const totalDuration = settings.focusDuration * 60
                    const elapsedSeconds = totalDuration - secondsRemaining + hyperfocusSeconds
                    const session: FocusSession = {
                        id: generateId(),
                        userId: '',
                        startedAt: sessionStartedAt,
                        durationMinutes: Math.floor(elapsedSeconds / 60),
                        actualDurationSeconds: elapsedSeconds,
                        hyperfocusSeconds: hyperfocusSeconds,
                        completed: true,
                        createdAt: now,
                    }
                    const { pendingSessions } = get()
                    set({ pendingSessions: [...pendingSessions, session] })
                }

                // Determine if auto-start is enabled for the next mode
                const shouldAutoStart = (mode === 'focus' && settings.autoStartBreaks) ||
                    (mode !== 'focus' && settings.autoStartPomodoros)

                set({
                    mode: nextMode,
                    status: shouldAutoStart ? 'running' : 'idle',
                    secondsRemaining: getDurationForMode(nextMode, settings),
                    hyperfocusSeconds: 0,
                    completedPomodoros: newPomodoros,
                    lastPomodoroDate: getLocalDateString(),
                    sessionStartedAt: shouldAutoStart ? new Date().toISOString() : null,
                    pausedFromHyperfocus: false,
                })
            },

            tick: () => {
                const { secondsRemaining } = get()
                if (secondsRemaining > 0) {
                    set({ secondsRemaining: secondsRemaining - 1 })
                }
            },

            tickHyperfocus: () => {
                const { hyperfocusSeconds } = get()
                set({ hyperfocusSeconds: hyperfocusSeconds + 1 })
            },

            enterHyperfocus: () => {
                set({ status: 'hyperfocus', hyperfocusSeconds: 0 })
            },

            exitHyperfocus: () => {
                const { mode, completedPomodoros, settings, hyperfocusSeconds, sessionStartedAt, lastPomodoroDate } = get()
                const dailyPomodoros = getDailyPomodoros(completedPomodoros, lastPomodoroDate)
                const nextMode = getNextMode(mode, dailyPomodoros, settings)
                const newPomodoros = dailyPomodoros + 1

                // Save session with hyperfocus time
                if (sessionStartedAt) {
                    const now = new Date().toISOString()
                    const totalSeconds = settings.focusDuration * 60 + hyperfocusSeconds
                    const session: FocusSession = {
                        id: crypto.randomUUID(),
                        userId: '',
                        startedAt: sessionStartedAt,
                        durationMinutes: Math.floor(totalSeconds / 60),
                        actualDurationSeconds: totalSeconds,
                        hyperfocusSeconds: hyperfocusSeconds,
                        completed: true,
                        createdAt: now,
                    }
                    const { pendingSessions } = get()
                    set({ pendingSessions: [...pendingSessions, session] })
                }

                set({
                    mode: nextMode,
                    status: 'idle',
                    secondsRemaining: getDurationForMode(nextMode, settings),
                    hyperfocusSeconds: 0,
                    completedPomodoros: newPomodoros,
                    lastPomodoroDate: getLocalDateString(),
                    sessionStartedAt: null,
                    pausedFromHyperfocus: false,
                })
            },

            toggleHyperfocus: () => {
                const { hyperfocusEnabled } = get()
                set({ hyperfocusEnabled: !hyperfocusEnabled })
            },

            updateSettings: (newSettings) => {
                const { settings, mode, status, secondsRemaining } = get()
                const merged = { ...settings, ...newSettings }
                const updates: Partial<TimerState> = { settings: merged }

                // If timer is idle, update the remaining seconds to match new durations
                if (status === 'idle') {
                    updates.secondsRemaining = getDurationForMode(mode, merged)
                }
                // If paused, try to preserve ELAPSED time
                // New Remaining = New Total - (Old Total - Old Remaining)
                else if (status === 'paused') {
                    const oldTotal = getDurationForMode(mode, settings)
                    const elapsed = oldTotal - secondsRemaining
                    const newTotal = getDurationForMode(mode, merged)
                    const newRemaining = Math.max(0, newTotal - elapsed)

                    updates.secondsRemaining = newRemaining
                }

                set(updates)
            },

            setSecondsRemaining: (seconds) => {
                set({ secondsRemaining: seconds })
            },

            resetStats: () => {
                set({ completedPomodoros: 0, pendingSessions: [] })
            },

            // Sync actions
            addPendingSession: (session) => {
                const { pendingSessions } = get()
                set({ pendingSessions: [...pendingSessions, session] })
            },

            removeSyncedSessions: (ids) => {
                const { pendingSessions } = get()
                set({
                    pendingSessions: pendingSessions.filter(
                        (s) => !ids.includes(s.id)
                    ),
                })
            },

            replaceSettings: (settings) => {
                const { mode, status } = get()
                const updates: Partial<TimerState> = { settings }
                // Recalculate timer when idle so synced durations apply
                if (status === 'idle') {
                    updates.secondsRemaining = getDurationForMode(mode, settings)
                }
                set(updates)
            },

            setCloudSessions: (sessions) => {
                set({ cloudSessions: sessions })
            },
        }),
        {
            name: 'pomodoro-timer-storage',
            // Persist timer state so navigation doesn't reset the timer
            partialize: (state) => ({
                settings: state.settings,
                completedPomodoros: state.completedPomodoros,
                lastPomodoroDate: state.lastPomodoroDate,
                hyperfocusEnabled: state.hyperfocusEnabled,
                mode: state.mode,
                status: state.status,
                secondsRemaining: state.secondsRemaining,
                hyperfocusSeconds: state.hyperfocusSeconds,
                pausedFromHyperfocus: state.pausedFromHyperfocus,
                sessionStartedAt: state.sessionStartedAt,
                pendingSessions: state.pendingSessions,
            }),
            // Deep merge to handle new settings fields (e.g. dashboardAccent)
            merge: (persisted, current) => {
                const p = persisted as Partial<TimerState> | undefined
                if (!p) return current
                const merged = { ...current, ...p }
                // Deep merge settings so new defaults aren't lost
                if (p.settings) {
                    merged.settings = {
                        ...current.settings,
                        ...p.settings,
                        modeColors: {
                            ...current.settings.modeColors,
                            ...(p.settings.modeColors ?? {}),
                        },
                    }
                }

                // Recover stale sessions: if there's an active focus session
                // from a previous day, auto-save the partial progress and reset
                if (
                    merged.mode === 'focus' &&
                    (merged.status === 'running' || merged.status === 'paused' || merged.status === 'hyperfocus') &&
                    merged.sessionStartedAt
                ) {
                    const sessionDate = new Date(merged.sessionStartedAt)
                    const sessionDay = `${sessionDate.getFullYear()}-${String(sessionDate.getMonth() + 1).padStart(2, '0')}-${String(sessionDate.getDate()).padStart(2, '0')}`
                    const today = getLocalDateString()

                    if (sessionDay !== today) {
                        const totalSeconds = getDurationForMode('focus', merged.settings)
                        const elapsedSeconds = totalSeconds - merged.secondsRemaining + (merged.hyperfocusSeconds || 0)
                        const elapsedMinutes = Math.floor(elapsedSeconds / 60)

                        // Only save if at least 1 minute was studied
                        if (elapsedMinutes >= 1) {
                            const session: FocusSession = {
                                id: generateId(),
                                userId: '',
                                startedAt: merged.sessionStartedAt,
                                durationMinutes: elapsedMinutes,
                                actualDurationSeconds: elapsedSeconds,
                                hyperfocusSeconds: merged.hyperfocusSeconds || 0,
                                completed: false,
                                createdAt: new Date().toISOString(),
                            }
                            merged.pendingSessions = [...(merged.pendingSessions || []), session]
                        }

                        // Reset timer to idle
                        merged.status = 'idle'
                        merged.secondsRemaining = getDurationForMode('focus', merged.settings)
                        merged.hyperfocusSeconds = 0
                        merged.sessionStartedAt = null
                        merged.pausedFromHyperfocus = false
                    }
                }

                return merged
            },
        }
    )
)
