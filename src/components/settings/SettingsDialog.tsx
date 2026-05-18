'use client'

import { useState } from 'react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
import { Settings, Volume2, Trash2 } from 'lucide-react'
import { useTimerStore } from '@/stores/timerStore'
import type { AppSettings } from '@/types'

type DurationField = 'focusDuration' | 'shortBreakDuration' | 'longBreakDuration' | 'pomodorosUntilLongBreak'

const durationDefaults: Record<DurationField, string> = {
    focusDuration: '25',
    shortBreakDuration: '5',
    longBreakDuration: '15',
    pomodorosUntilLongBreak: '4',
}

export function SettingsDialog() {
    const settings = useTimerStore((s) => s.settings)
    const updateSettings = useTimerStore((s) => s.updateSettings)
    const resetStats = useTimerStore((s) => s.resetStats)
    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState<AppSettings>(settings)
    const [draftInputs, setDraftInputs] = useState<Record<DurationField, string>>({
        focusDuration: String(settings.focusDuration),
        shortBreakDuration: String(settings.shortBreakDuration),
        longBreakDuration: String(settings.longBreakDuration),
        pomodorosUntilLongBreak: String(settings.pomodorosUntilLongBreak),
    })

    const handleOpen = (isOpen: boolean) => {
        if (isOpen) {
            setDraft({ ...settings })
            setDraftInputs({
                focusDuration: String(settings.focusDuration),
                shortBreakDuration: String(settings.shortBreakDuration),
                longBreakDuration: String(settings.longBreakDuration),
                pomodorosUntilLongBreak: String(settings.pomodorosUntilLongBreak),
            })
        }
        setOpen(isOpen)
    }

    const update = (newSettings: AppSettings) => {
        setDraft(newSettings)
        updateSettings(newSettings)
    }

    const handleDurationChange = (field: DurationField, rawValue: string) => {
        setDraftInputs((prev) => ({ ...prev, [field]: rawValue }))
        const num = Number(rawValue)
        if (rawValue !== '' && !isNaN(num) && num >= 1) {
            update({ ...draft, [field]: num })
        }
    }

    const handleClose = () => {
        setOpen(false)
    }

    return (
        <Dialog open={open} onOpenChange={handleOpen}>
            <DialogTrigger asChild>
                <button
                    className="text-zinc-500 hover:text-zinc-300 transition-colors"
                    aria-label="Settings"
                >
                    <Settings className="h-5 w-5" />
                </button>
            </DialogTrigger>
            <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-white">Settings</DialogTitle>
                </DialogHeader>

                <div className="space-y-6 pb-2">
                    {/* Timer Durations */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            Timer (minutes)
                        </h3>
                        <div className="grid grid-cols-3 gap-3">
                            <div>
                                <Label className="text-xs text-zinc-500">PomoLock</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={120}
                                    value={draftInputs.focusDuration}
                                    onChange={(e) =>
                                        handleDurationChange('focusDuration', e.target.value)
                                    }
                                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-center"
                                />
                                {draftInputs.focusDuration === '' && (
                                    <p className="text-[11px] text-red-500 mt-1">Required</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500">Short Break</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={draftInputs.shortBreakDuration}
                                    onChange={(e) =>
                                        handleDurationChange('shortBreakDuration', e.target.value)
                                    }
                                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-center"
                                />
                                {draftInputs.shortBreakDuration === '' && (
                                    <p className="text-[11px] text-red-500 mt-1">Required</p>
                                )}
                            </div>
                            <div>
                                <Label className="text-xs text-zinc-500">Long Break</Label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={60}
                                    value={draftInputs.longBreakDuration}
                                    onChange={(e) =>
                                        handleDurationChange('longBreakDuration', e.target.value)
                                    }
                                    className="bg-zinc-800 border-zinc-700 text-white h-9 text-center"
                                />
                                {draftInputs.longBreakDuration === '' && (
                                    <p className="text-[11px] text-red-500 mt-1">Required</p>
                                )}
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
                                value={draftInputs.pomodorosUntilLongBreak}
                                onChange={(e) =>
                                    handleDurationChange('pomodorosUntilLongBreak', e.target.value)
                                }
                                className="bg-zinc-800 border-zinc-700 text-white h-9 w-20 text-center"
                            />
                            {draftInputs.pomodorosUntilLongBreak === '' && (
                                <p className="text-[11px] text-red-500 mt-1">Required</p>
                            )}
                        </div>
                    </section>

                    {/* Auto-start */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            Auto-start
                        </h3>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm text-zinc-300">Breaks</Label>
                            <Switch
                                checked={draft.autoStartBreaks}
                                onCheckedChange={(v) =>
                                    update({ ...draft, autoStartBreaks: v })
                                }
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm text-zinc-300">Pomodoros</Label>
                            <Switch
                                checked={draft.autoStartPomodoros}
                                onCheckedChange={(v) =>
                                    update({ ...draft, autoStartPomodoros: v })
                                }
                            />
                        </div>
                    </section>

                    {/* Sound */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            Sound
                        </h3>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm text-zinc-300">Alarm sound</Label>
                            <Switch
                                checked={draft.soundEnabled}
                                onCheckedChange={(v) =>
                                    update({ ...draft, soundEnabled: v })
                                }
                            />
                        </div>

                        {/* Alarm Sound Selector */}
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

                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-zinc-500">Volume</Label>
                                <span className="text-xs text-zinc-500 tabular-nums">{Math.round(draft.soundVolume * 100)}%</span>
                            </div>
                            <Slider
                                min={0}
                                max={100}
                                step={5}
                                value={[draft.soundVolume * 100]}
                                onValueChange={([v]) =>
                                    update({ ...draft, soundVolume: v / 100 })
                                }
                                className="w-full"
                            />
                        </div>
                        <div className="space-y-1.5 pt-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs text-zinc-500">Repeat Count</Label>
                                <span className="text-xs text-zinc-500 tabular-nums">{draft.alarmRepeatCount ?? 3}x</span>
                            </div>
                            <Slider
                                min={1}
                                max={10}
                                step={1}
                                value={[draft.alarmRepeatCount ?? 3]}
                                onValueChange={([v]) =>
                                    update({ ...draft, alarmRepeatCount: v })
                                }
                                className="w-full"
                            />
                        </div>
                    </section>

                    {/* General Settings */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            General
                        </h3>
                        <div className="flex items-center justify-between">
                            <Label className="text-sm text-zinc-300">Show timer in browser tab</Label>
                            <Switch
                                checked={draft.showTimerInTitle ?? true}
                                onCheckedChange={(v) =>
                                    update({ ...draft, showTimerInTitle: v })
                                }
                            />
                        </div>
                    </section>

                    {/* Mode Colors */}
                    <section className="space-y-3">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            Accent Colors
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {[
                                { key: 'focus' as const, label: 'PomoLock' },
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
                                onClick={() => update({
                                    ...draft,
                                    dashboardAccent: '#64748b',
                                    modeColors: {
                                        focus: '#e74c6f',
                                        shortBreak: '#1fcf81',
                                        longBreak: '#397097',
                                        hyperfocus: '#8b5cf6',
                                    },
                                })}
                                className="text-[10px] h-6 px-2 text-zinc-500 hover:text-zinc-300"
                            >
                                Reset to Default
                            </Button>
                        </div>
                    </section>

                    {/* Danger Zone */}
                    <section className="space-y-3 pt-2 border-t border-zinc-800">
                        <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
                            Danger Zone
                        </h3>
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                                if (window.confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
                                    resetStats()
                                }
                            }}
                            className="w-full"
                        >
                            <Trash2 className="h-4 w-4" />
                            Reset Statistics
                        </Button>
                    </section>

                    {/* Close */}
                    <Button
                        onClick={handleClose}
                        className="w-full bg-zinc-700 hover:bg-zinc-600 text-white"
                    >
                        Close
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
