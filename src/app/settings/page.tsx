'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'
import { deleteCloudSessions } from '@/lib/syncController'
import { useTimerStore } from '@/stores/timerStore'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Button } from '@/components/ui/button'
import {
    ArrowLeft,
    Volume2,
    Trash2,
    LogIn,
    LogOut,
    Cloud,
    CloudOff,
    Download,
} from 'lucide-react'
import Link from 'next/link'
import type { AppSettings } from '@/types'

export default function SettingsPage() {
    const { user, loading: userLoading } = useUser()
    const settings = useTimerStore((s) => s.settings)
    const updateSettings = useTimerStore((s) => s.updateSettings)
    const resetStats = useTimerStore((s) => s.resetStats)
    const [draft, setDraft] = useState<AppSettings>(settings)
    const pendingSessions = useTimerStore((s) => s.pendingSessions)
    const cloudSessions = useTimerStore((s) => s.cloudSessions)

    // Sync draft when store settings change externally
    useEffect(() => {
        setDraft(settings)
    }, [settings])

    const update = (newSettings: AppSettings) => {
        setDraft(newSettings)
        updateSettings(newSettings)
    }

    const handleGoogleLogin = async () => {
        const supabase = createClient()
        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback?next=/settings`,
            },
        })
    }

    const handleLogout = async () => {
        const supabase = createClient()
        await supabase.auth.signOut()
        window.location.href = '/settings'
    }

    const handleExportData = () => {
        // Merge and deduplicate sessions
        const sessionMap = new Map()
        for (const s of cloudSessions) sessionMap.set(s.id, s)
        for (const s of pendingSessions) if (!sessionMap.has(s.id)) sessionMap.set(s.id, s)
        const allSessions = Array.from(sessionMap.values())

        const data = {
            exportedAt: new Date().toISOString(),
            settings: draft,
            sessions: allSessions,
        }

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `pomolock-export-${new Date().toISOString().slice(0, 10)}.json`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="min-h-screen bg-[#1A1B24] pt-16 pb-16 px-4">
            <div className="max-w-lg mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center gap-3">
                    <Link
                        href="/"
                        className="text-zinc-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Settings</h1>
                </div>

                {/* ===== Account Section ===== */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-white">Account</h2>
                    <div className="border-t border-zinc-800" />

                    {userLoading ? (
                        <div className="flex items-center gap-3 py-2">
                            <div className="h-10 w-10 rounded-full bg-zinc-800 animate-pulse" />
                            <div className="space-y-2 flex-1">
                                <div className="h-4 w-32 bg-zinc-800 rounded animate-pulse" />
                                <div className="h-3 w-48 bg-zinc-800 rounded animate-pulse" />
                            </div>
                        </div>
                    ) : user ? (
                        <div className="space-y-4">
                            <div className="flex items-center gap-3">
                                {user.user_metadata?.avatar_url ? (
                                    <img
                                        src={user.user_metadata.avatar_url}
                                        alt="Avatar"
                                        className="h-10 w-10 rounded-full ring-2 ring-zinc-700"
                                    />
                                ) : (
                                    <div className="h-10 w-10 rounded-full bg-zinc-700 flex items-center justify-center text-white font-semibold text-sm">
                                        {(user.user_metadata?.full_name || user.email || '?')[0].toUpperCase()}
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white truncate">
                                        {user.user_metadata?.full_name || 'User'}
                                    </p>
                                    <p className="text-xs text-zinc-500 truncate">
                                        {user.email}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                                    <Cloud className="h-3.5 w-3.5" />
                                    <span>Synced</span>
                                </div>
                            </div>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleLogout}
                                className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10 gap-2"
                            >
                                <LogOut className="h-4 w-4" />
                                Sign out
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            <div className="flex items-center gap-2 text-xs text-zinc-500">
                                <CloudOff className="h-3.5 w-3.5" />
                                <span>Local only — sign in to sync across devices</span>
                            </div>
                            <button
                                onClick={handleGoogleLogin}
                                className="flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-800 font-medium py-2.5 px-4 rounded-xl transition-all duration-200 hover:shadow-lg hover:shadow-white/5 active:scale-[0.98] text-sm cursor-pointer"
                            >
                                <svg className="h-4 w-4" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Sign in with Google
                            </button>
                        </div>
                    )}
                </section>

                {/* ===== Timer Section ===== */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-white">Timer</h2>
                    <div className="border-t border-zinc-800" />

                    <div className="space-y-1">
                        <Label className="text-xs text-zinc-500">Duration (minutes)</Label>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs text-zinc-500">Focus</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={draft.focusDuration}
                                    onChange={(e) =>
                                        update({ ...draft, focusDuration: +e.target.value || 1 })
                                    }
                                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-center"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500">Short Break</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={draft.shortBreakDuration}
                                    onChange={(e) =>
                                        update({ ...draft, shortBreakDuration: +e.target.value || 1 })
                                    }
                                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-center"
                                />
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500">Long Break</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={draft.longBreakDuration}
                                    onChange={(e) =>
                                        update({ ...draft, longBreakDuration: +e.target.value || 1 })
                                    }
                                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-center"
                                />
                            </div>
                        </div>
                    </div>

                    <div>
                        <Label className="text-xs text-zinc-500">
                            Pomodoros until long break
                        </Label>
                        <Input
                            type="number"
                            min={1}
                            max={12}
                            value={draft.pomodorosUntilLongBreak}
                            onChange={(e) =>
                                update({ ...draft, pomodorosUntilLongBreak: +e.target.value || 1 })
                            }
                            className="bg-zinc-800 border-zinc-700 text-white h-9 w-20 text-center"
                        />
                    </div>
                </section>

                {/* ===== Auto-start Section ===== */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-white">Auto-start</h2>
                    <div className="border-t border-zinc-800" />

                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm text-zinc-300">Breaks</Label>
                                <p className="text-xs text-zinc-600">Automatically start break timers</p>
                            </div>
                            <Switch
                                checked={draft.autoStartBreaks}
                                onCheckedChange={(v) => update({ ...draft, autoStartBreaks: v })}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm text-zinc-300">Pomodoros</Label>
                                <p className="text-xs text-zinc-600">Automatically start focus timers</p>
                            </div>
                            <Switch
                                checked={draft.autoStartPomodoros}
                                onCheckedChange={(v) => update({ ...draft, autoStartPomodoros: v })}
                            />
                        </div>
                    </div>
                </section>

                {/* ===== Sound Section ===== */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-white">Sound</h2>
                    <div className="border-t border-zinc-800" />

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <Label className="text-sm text-zinc-300">Alarm sound</Label>
                                <p className="text-xs text-zinc-600">Play a sound when the timer ends</p>
                            </div>
                            <Switch
                                checked={draft.soundEnabled}
                                onCheckedChange={(v) => update({ ...draft, soundEnabled: v })}
                            />
                        </div>

                        {/* Alarm tone selector */}
                        <div className="space-y-1.5">
                            <Label className="text-xs text-zinc-500">Alarm Tone</Label>
                            <div className="flex items-center gap-2">
                                {([
                                    { value: 'bip' as const, label: 'Bip' },
                                    { value: 'kazakhstan' as const, label: 'Kazakhstan' },
                                ] as const).map(({ value, label }) => (
                                    <button
                                        key={value}
                                        onClick={() => update({ ...draft, alarmSound: value })}
                                        className={`flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${(draft.alarmSound ?? 'bip') === value
                                            ? 'bg-zinc-600 text-white'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                            }`}
                                    >
                                        {label}
                                    </button>
                                ))}
                                <button
                                    onClick={() => {
                                        const file = (draft.alarmSound ?? 'bip') === 'kazakhstan' ? '/kazakhstan.mp3' : '/bip.mp3'
                                        const audio = new Audio(file)
                                        audio.volume = draft.soundVolume
                                        audio.play().catch(() => { })
                                    }}
                                    className="p-1.5 rounded-md bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors"
                                    aria-label="Test alarm sound"
                                    title="Test"
                                >
                                    <Volume2 className="h-4 w-4" />
                                </button>
                            </div>
                        </div>

                        {/* Volume */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-zinc-500">Volume</Label>
                                <span className="text-xs text-zinc-500 tabular-nums">
                                    {Math.round(draft.soundVolume * 100)}%
                                </span>
                            </div>
                            <Slider
                                min={0}
                                max={100}
                                step={5}
                                value={[draft.soundVolume * 100]}
                                onValueChange={([v]) => update({ ...draft, soundVolume: v / 100 })}
                                className="w-full"
                            />
                        </div>

                        {/* Repeat count */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-zinc-500">Repeat Count</Label>
                                <span className="text-xs text-zinc-500 tabular-nums">
                                    {draft.alarmRepeatCount ?? 3}x
                                </span>
                            </div>
                            <Slider
                                min={1}
                                max={10}
                                step={1}
                                value={[draft.alarmRepeatCount ?? 3]}
                                onValueChange={([v]) => update({ ...draft, alarmRepeatCount: v })}
                                className="w-full"
                            />
                        </div>
                    </div>
                </section>

                {/* ===== General Section ===== */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-white">General</h2>
                    <div className="border-t border-zinc-800" />

                    <div className="flex items-center justify-between">
                        <div>
                            <Label className="text-sm text-zinc-300">Show timer in browser tab</Label>
                            <p className="text-xs text-zinc-600">Display remaining time in the tab title</p>
                        </div>
                        <Switch
                            checked={draft.showTimerInTitle ?? true}
                            onCheckedChange={(v) => update({ ...draft, showTimerInTitle: v })}
                        />
                    </div>
                </section>

                {/* ===== Data Section ===== */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-white">Data</h2>
                    <div className="border-t border-zinc-800" />

                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleExportData}
                        className="text-zinc-400 hover:text-white hover:bg-zinc-800/60 gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export Data (JSON)
                    </Button>
                </section>

                {/* ===== Appearance Section ===== */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-white">Appearance</h2>
                    <div className="border-t border-zinc-800" />

                    <div className="space-y-3">
                        <Label className="text-xs text-zinc-500">Accent Colors</Label>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'focus' as const, label: 'Focus' },
                                { key: 'shortBreak' as const, label: 'Short Break' },
                                { key: 'longBreak' as const, label: 'Long Break' },
                                { key: 'hyperfocus' as const, label: 'Hyperfocus' },
                            ].map(({ key, label }) => (
                                <div key={key} className="flex items-center gap-2">
                                    <input
                                        type="color"
                                        value={draft.modeColors[key]}
                                        onChange={(e) =>
                                            update({
                                                ...draft,
                                                modeColors: {
                                                    ...draft.modeColors,
                                                    [key]: e.target.value,
                                                },
                                            })
                                        }
                                        className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-moz-color-swatch]:rounded-full"
                                    />
                                    <Label className="text-xs text-zinc-400">{label}</Label>
                                </div>
                            ))}
                        </div>

                        <div className="flex items-center justify-between pt-1">
                            <div className="flex items-center gap-2">
                                <input
                                    type="color"
                                    value={draft.dashboardAccent}
                                    onChange={(e) =>
                                        update({ ...draft, dashboardAccent: e.target.value })
                                    }
                                    className="w-8 h-8 rounded-full border-0 cursor-pointer bg-transparent [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch-wrapper]:p-0.5 [&::-moz-color-swatch]:rounded-full"
                                />
                                <Label className="text-xs text-zinc-400">Dashboard</Label>
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                    update({
                                        ...draft,
                                        dashboardAccent: '#64748b',
                                        modeColors: {
                                            focus: '#e74c6f',
                                            shortBreak: '#1fcf81',
                                            longBreak: '#397097',
                                            hyperfocus: '#8b5cf6',
                                        },
                                    })
                                }
                                className="text-[10px] h-6 px-2 text-zinc-500 hover:text-zinc-300"
                            >
                                Reset to Default
                            </Button>
                        </div>
                    </div>
                </section>

                {/* ===== Danger Zone ===== */}
                <section className="space-y-4">
                    <h2 className="text-base font-semibold text-red-400">Danger Zone</h2>
                    <div className="border-t border-red-900/30" />

                    <Button
                        variant="destructive"
                        size="sm"
                        onClick={async () => {
                            if (
                                window.confirm(
                                    'Are you sure you want to reset all statistics? This cannot be undone.'
                                )
                            ) {
                                resetStats()
                                localStorage.removeItem('pomodoro-timer-storage')
                                await deleteCloudSessions()
                                window.location.reload()
                            }
                        }}
                        className="w-full"
                    >
                        <Trash2 className="h-4 w-4" />
                        Reset Statistics
                    </Button>
                </section>
            </div>
        </div>
    )
}
