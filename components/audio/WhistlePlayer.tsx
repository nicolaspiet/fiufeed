'use client'

import { useEffect, useRef, useState } from 'react'
import { Pause, Play } from 'lucide-react'
import { formatDuration } from '@/lib/utils/audio'

interface WhistlePlayerProps {
  audioUrl: string
  duration: number
  compact?: boolean
}

export function WhistlePlayer({ audioUrl, duration, compact = false }: WhistlePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null)
  const [playing, setPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const onTime = () => setCurrentTime(audio.currentTime)
    const onEnded = () => {
      setPlaying(false)
      setCurrentTime(0)
    }

    audio.addEventListener('timeupdate', onTime)
    audio.addEventListener('ended', onEnded)

    return () => {
      audio.removeEventListener('timeupdate', onTime)
      audio.removeEventListener('ended', onEnded)
    }
  }, [])

  function togglePlay() {
    const audio = audioRef.current
    if (!audio) return

    if (playing) {
      audio.pause()
      setPlaying(false)
      return
    }

    audio.play()
    setPlaying(true)
  }

  function handleSeek(event: React.ChangeEvent<HTMLInputElement>) {
    const audio = audioRef.current
    if (!audio) return
    const nextTime = Number(event.target.value)
    audio.currentTime = nextTime
    setCurrentTime(nextTime)
  }

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <audio ref={audioRef} src={audioUrl} preload="metadata" />
        <button
          onClick={togglePlay}
          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 transition-colors hover:bg-emerald-400"
        >
          {playing ? <Pause size={14} className="text-white" /> : <Play size={14} className="ml-0.5 text-white" />}
        </button>
        <div className="h-1 flex-1 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
          <div className="h-full bg-emerald-400 transition-all" style={{ width: `${progress}%` }} />
        </div>
        <span className="w-10 flex-shrink-0 text-right text-xs" style={{ color: 'var(--text-muted)' }}>
          {playing ? formatDuration(Math.floor(currentTime)) : formatDuration(duration)}
        </span>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl px-4 py-3" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <audio ref={audioRef} src={audioUrl} preload="metadata" />
      <button
        onClick={togglePlay}
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-emerald-500 transition-colors hover:bg-emerald-400"
      >
        {playing ? <Pause size={18} className="text-white" /> : <Play size={18} className="ml-0.5 text-white" />}
      </button>
      <div className="flex-1 space-y-1">
        <input
          type="range"
          min={0}
          max={duration}
          step={0.1}
          value={currentTime}
          onChange={handleSeek}
          className="h-1.5 w-full cursor-pointer appearance-none rounded-full accent-emerald-400"
          style={{ background: 'var(--border)' }}
        />
        <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
          <span>{formatDuration(Math.floor(currentTime))}</span>
          <span>{formatDuration(duration)}</span>
        </div>
      </div>
    </div>
  )
}
