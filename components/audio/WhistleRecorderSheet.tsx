'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Mic, RotateCcw, Send, Square, X } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { MAX_DURATION_S, formatDuration, getAudioStoragePath } from '@/lib/utils/audio'
import { WhistlePlayer } from './WhistlePlayer'

type RecordState = 'idle' | 'recording' | 'preview'

export interface CreatedWhistle {
  id: string
  audio_url: string
  duration_s: number
  caption: string
  group_id: string | null
}

interface WhistleRecorderSheetProps {
  userId: string
  groupId?: string
  destinationLabel?: string
  onClose: () => void
  onPosted: (whistle: CreatedWhistle) => void | Promise<void>
}

export function WhistleRecorderSheet({ userId, groupId, destinationLabel, onClose, onPosted }: WhistleRecorderSheetProps) {
  const supabase = createClient()
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const [state, setState] = useState<RecordState>('idle')
  const [elapsed, setElapsed] = useState(0)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [posting, setPosting] = useState(false)
  const [error, setError] = useState('')
  const [micError, setMicError] = useState('')

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (audioUrl) URL.revokeObjectURL(audioUrl)
    }
  }, [audioUrl])

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  async function startRecording() {
    setMicError('')

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data)
      }

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const previewUrl = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(previewUrl)
        setState('preview')
        stream.getTracks().forEach((track) => track.stop())
      }

      mediaRecorder.start(250)
      mediaRecorderRef.current = mediaRecorder
      setState('recording')
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((previous) => {
          if (previous + 1 >= MAX_DURATION_S) {
            stopRecording()
            return previous + 1
          }
          return previous + 1
        })
      }, 1000)
    } catch {
      setMicError('Acesso ao microfone negado. Verifique as permissões do navegador.')
    }
  }

  function stopRecording() {
    stopTimer()
    mediaRecorderRef.current?.stop()
    mediaRecorderRef.current = null
  }

  function reset() {
    stopTimer()
    if (audioUrl) URL.revokeObjectURL(audioUrl)
    setAudioBlob(null)
    setAudioUrl(null)
    setElapsed(0)
    setCaption('')
    setError('')
    setState('idle')
  }

  async function handlePost() {
    if (!audioBlob) return

    setPosting(true)
    setError('')

    try {
      const path = getAudioStoragePath(userId, 'whistle.webm')
      const { error: uploadError } = await supabase.storage
        .from('audio-whistles')
        .upload(path, audioBlob, { contentType: audioBlob.type, upsert: false })

      if (uploadError) throw uploadError

      const { data: createdWhistle, error: insertError } = await supabase.from('whistles').insert({
        user_id: userId,
        audio_url: path,
        duration_s: elapsed,
        caption: caption.trim(),
        group_id: groupId ?? null,
      }).select('id, audio_url, duration_s, caption, group_id').single()

      if (insertError) throw insertError

      await onPosted(createdWhistle)
    } catch (caughtError: unknown) {
      setError(caughtError instanceof Error ? caughtError.message : 'Erro ao publicar. Tente novamente.')
    } finally {
      setPosting(false)
    }
  }

  const progressPct = (elapsed / MAX_DURATION_S) * 100

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center lg:items-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full space-y-5 rounded-t-3xl p-6 shadow-2xl lg:max-w-md lg:rounded-3xl" style={{ background: 'var(--bg)', border: '1px solid var(--border)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Novo post</h2>
            <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
              Publicando em {destinationLabel ?? 'Fiufeed'}
            </p>
          </div>
          <button onClick={onClose} style={{ color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        </div>

        {state === 'idle' && (
          <div className="flex flex-col items-center gap-4 py-6">
            {micError && <p className="text-center text-sm text-red-400">{micError}</p>}
            <button
              onClick={startRecording}
              className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500 shadow-lg shadow-emerald-900/50 transition-colors hover:bg-emerald-400"
            >
              <Mic size={32} className="text-white" />
            </button>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Toque para gravar</p>
          </div>
        )}

        {state === 'recording' && (
          <div className="flex flex-col items-center gap-4 py-6">
            <div className="relative">
              <div className="absolute inset-0 h-20 w-20 animate-pulse rounded-full bg-red-500/20" />
              <button
                onClick={stopRecording}
                className="relative flex h-20 w-20 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-400"
              >
                <Square size={28} className="text-white" />
              </button>
            </div>
            <div className="w-full space-y-2">
              <div className="h-1.5 overflow-hidden rounded-full" style={{ background: 'var(--border)' }}>
                <div className="h-full bg-emerald-400 transition-all duration-1000" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
                <span className="font-medium text-red-400">{formatDuration(elapsed)}</span>
                <span>{formatDuration(MAX_DURATION_S)}</span>
              </div>
            </div>
          </div>
        )}

        {state === 'preview' && audioUrl && (
          <div className="space-y-4">
            <WhistlePlayer audioUrl={audioUrl} duration={elapsed} />
            <textarea
              value={caption}
              onChange={(event) => setCaption(event.target.value)}
              placeholder="Adicione uma legenda... (opcional)"
              maxLength={280}
              rows={3}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm transition-colors focus:outline-none focus:border-emerald-500"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={reset}
                className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition-colors"
                style={{ border: '1px solid var(--border)', color: 'var(--text-muted)' }}
              >
                <RotateCcw size={14} />
                Regravar
              </button>
              <button
                onClick={handlePost}
                disabled={posting}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50 hover:bg-emerald-400"
              >
                <Send size={14} />
                {posting ? 'Publicando...' : 'Publicar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
