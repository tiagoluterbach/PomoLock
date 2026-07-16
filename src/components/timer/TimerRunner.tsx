'use client'

import { useEffect, useRef } from 'react'
import { useTimerStore } from '@/stores/timerStore'

// Request notification permission on first load
function requestNotificationPermission() {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission()
    }
}

function showTimerNotification(mode: string) {
    if (typeof window === 'undefined' || !('Notification' in window) || Notification.permission !== 'granted') return

    const title = mode === 'focus' ? '⏰ Pomodoro finished!' : '☕ Break is over!'
    const body = mode === 'focus' ? 'Time for a break!' : 'Time to focus!'

    try {
        const notification = new Notification(title, {
            body,
            icon: '/icon-192.png',
            tag: 'pomolock-timer', // Replaces previous notification
            requireInteraction: true, // Stays until user clicks
        })

        notification.onclick = () => {
            window.focus()
            notification.close()
        }
    } catch (_) {
        // Fallback: some browsers don't support Notification constructor in this context
    }
}

export function TimerRunner() {
    const status = useTimerStore((s) => s.status)
    const mode = useTimerStore((s) => s.mode)
    const secondsRemaining = useTimerStore((s) => s.secondsRemaining)
    const hyperfocusSeconds = useTimerStore((s) => s.hyperfocusSeconds)
    const tick = useTimerStore((s) => s.tick)
    const tickHyperfocus = useTimerStore((s) => s.tickHyperfocus)

    // Settings
    const showTimerInTitle = useTimerStore((s) => s.settings.showTimerInTitle ?? true)

    const workerRef = useRef<Worker | null>(null)
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const alarmCancelledRef = useRef(false)
    // Web Audio API context + pre-decoded buffers for background-tab playback
    const audioCtxRef = useRef<AudioContext | null>(null)
    const audioBuffersRef = useRef<Record<string, AudioBuffer>>({})
    const keepAliveRef = useRef<number | null>(null)

    // Request notification permission on mount
    useEffect(() => {
        requestNotificationPermission()
    }, [])

    // Initialize worker
    useEffect(() => {
        if (typeof Worker !== 'undefined') {
            workerRef.current = new Worker('/timerWorker.js')
            workerRef.current.onmessage = (e) => {
                if (e.data.type === 'tick') {
                    const state = useTimerStore.getState()
                    if (state.status === 'hyperfocus') {
                        state.tickHyperfocus()
                    } else if (state.status === 'running') {
                        state.tick()
                    }
                } else if (e.data.type === 'completed') {
                    // Worker detected timer completion — handle alarm + notification
                    const state = useTimerStore.getState()
                    if (state.status !== 'running') return // Already handled

                    const { settings, mode, hyperfocusEnabled, reset, enterHyperfocus } = state

                    // Show notification (works in background tabs!)
                    if (!document.hasFocus()) {
                        showTimerNotification(mode)
                    }

                    // Play alarm sound
                    const shouldPlaySound = settings.soundEnabled && !(mode === 'focus' && hyperfocusEnabled)
                    if (shouldPlaySound) {
                        playAlarm(settings)
                    }

                    // Handle mode transition
                    if (mode === 'focus' && hyperfocusEnabled) {
                        enterHyperfocus()
                        workerRef.current?.postMessage({ type: 'hyperfocus' })
                    } else {
                        state.complete()
                    }
                }
            }
        }

        return () => {
            workerRef.current?.terminate()
        }
    }, [])

    // Initialize AudioContext on first user interaction & pre-fetch audio buffers
    useEffect(() => {
        const initAudioContext = async () => {
            if (audioCtxRef.current) return
            const ctx = new AudioContext()
            audioCtxRef.current = ctx

            // Pre-fetch and decode audio files
            for (const file of ['/bip.mp3', '/kazakhstan.mp3']) {
                try {
                    const response = await fetch(file)
                    const arrayBuffer = await response.arrayBuffer()
                    const audioBuffer = await ctx.decodeAudioData(arrayBuffer)
                    audioBuffersRef.current[file] = audioBuffer
                } catch (_) { /* silently ignore if fetch fails */ }
            }
        }

        // Initialize on first click/keypress (required by browsers)
        const handler = () => {
            initAudioContext()
            window.removeEventListener('click', handler)
            window.removeEventListener('keydown', handler)
        }
        window.addEventListener('click', handler)
        window.addEventListener('keydown', handler)

        return () => {
            window.removeEventListener('click', handler)
            window.removeEventListener('keydown', handler)
        }
    }, [])

    // Keep AudioContext alive when timer is running (prevents browser suspension)
    useEffect(() => {
        if ((status === 'running' || status === 'hyperfocus') && audioCtxRef.current) {
            // Play a silent pulse every 25s to keep AudioContext active
            const ping = () => {
                const ctx = audioCtxRef.current
                if (!ctx || ctx.state === 'closed') return
                if (ctx.state === 'suspended') ctx.resume()
                const osc = ctx.createOscillator()
                const gain = ctx.createGain()
                gain.gain.value = 0 // silent
                osc.connect(gain)
                gain.connect(ctx.destination)
                osc.start()
                osc.stop(ctx.currentTime + 0.01)
            }
            ping()
            keepAliveRef.current = window.setInterval(ping, 25000)
            return () => {
                if (keepAliveRef.current) clearInterval(keepAliveRef.current)
            }
        } else {
            if (keepAliveRef.current) {
                clearInterval(keepAliveRef.current)
                keepAliveRef.current = null
            }
        }
    }, [status])

    // Helper to play alarm sound (Web Audio API — works in background tabs)
    const playAlarm = (settings: { alarmSound: string; soundVolume: number; alarmRepeatCount: number }) => {
        try {
            const repeat = settings.alarmRepeatCount || 3
            const soundFile = settings.alarmSound === 'kazakhstan' ? '/kazakhstan.mp3' : '/bip.mp3'
            alarmCancelledRef.current = false

            const ctx = audioCtxRef.current
            const buffer = audioBuffersRef.current[soundFile]

            // Fallback to HTML Audio if Web Audio API isn't available
            if (!ctx || !buffer) {
                const playOnce = (index: number) => {
                    if (index >= repeat || alarmCancelledRef.current) return
                    const audio = new Audio(soundFile)
                    audio.volume = settings.soundVolume
                    audioRef.current = audio
                    audio.play().catch(() => {})
                    audio.onended = () => {
                        audioRef.current = null
                        playOnce(index + 1)
                    }
                }
                playOnce(0)
                return
            }

            // Resume context if suspended
            if (ctx.state === 'suspended') ctx.resume()

            const playOnce = (index: number) => {
                if (index >= repeat || alarmCancelledRef.current) return
                const source = ctx.createBufferSource()
                const gainNode = ctx.createGain()
                source.buffer = buffer
                gainNode.gain.value = settings.soundVolume
                source.connect(gainNode)
                gainNode.connect(ctx.destination)
                source.onended = () => playOnce(index + 1)
                source.start()
            }
            playOnce(0)
        } catch (e) {
            console.error("Audio playback failed", e)
        }
    }

    // Helper to stop alarm
    const stopAlarm = () => {
        if (audioRef.current) {
            try {
                audioRef.current.pause()
                audioRef.current.currentTime = 0
            } catch (_) { /* ignore */ }
            audioRef.current = null
        }
        alarmCancelledRef.current = true
    }

    // Listen for explicit "stop alarm" from UI components (e.g. ModeSelector)
    useEffect(() => {
        const handler = () => stopAlarm()
        window.addEventListener('pomodoro-stop-alarm', handler)
        return () => window.removeEventListener('pomodoro-stop-alarm', handler)
    }, [])

    // Start/Stop worker + stop alarm ONLY when user starts a new timer
    useEffect(() => {
        if (status === 'running') {
            stopAlarm()
            workerRef.current?.postMessage({ type: 'start', seconds: secondsRemaining })
        } else if (status === 'hyperfocus') {
            stopAlarm()
            workerRef.current?.postMessage({ type: 'start', seconds: 0 })
            workerRef.current?.postMessage({ type: 'hyperfocus' })
        } else {
            workerRef.current?.postMessage({ type: 'stop' })
        }
    }, [status])

    // Fallback: Alarm & Completion Logic for when tab IS in foreground
    // (the worker 'completed' handler above covers background tabs)
    useEffect(() => {
        if (status === 'running' && secondsRemaining === 0) {
            // Check if worker already handled this (it might have via 'completed' message)
            // The worker sets secondsRemaining via tick(), so if we get here,
            // it means the React effect fired. The worker's 'completed' handler
            // also runs, but it checks status === 'running' which would be false
            // after reset(). So this is safe as a double-check.
            const state = useTimerStore.getState()
            if (state.status !== 'running') return // Already handled by worker

            const { settings, mode, hyperfocusEnabled, reset, enterHyperfocus } = state

            const shouldPlaySound = settings.soundEnabled && !(mode === 'focus' && hyperfocusEnabled)
            if (shouldPlaySound) {
                playAlarm(settings)
            }

            if (mode === 'focus' && hyperfocusEnabled) {
                enterHyperfocus()
                workerRef.current?.postMessage({ type: 'hyperfocus' })
            } else {
                state.complete()
            }
        }
    }, [secondsRemaining, status])

    // Update Page Title
    useEffect(() => {
        if (!showTimerInTitle) {
            document.title = 'PomoLock'
            return
        }

        const format = (s: number) => {
            const m = Math.floor(s / 60)
            const sec = s % 60
            return `${m}:${sec.toString().padStart(2, '0')}`
        }

        let title = 'PomoLock'
        if (status === 'running' || status === 'paused') {
            title = `(${format(secondsRemaining)}) ${mode === 'focus' ? 'PomoLock' : 'Break'}`
        } else if (status === 'hyperfocus') {
            title = `(Hyper: ${format(hyperfocusSeconds)}) PomoLock`
        }

        document.title = title
    }, [secondsRemaining, hyperfocusSeconds, status, mode, showTimerInTitle])

    return null
}
