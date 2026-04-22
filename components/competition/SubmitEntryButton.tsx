'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WhistleRecorderSheet, type CreatedWhistle } from '@/components/audio/WhistleRecorderSheet'

interface SubmitEntryButtonProps {
  competitionId: string
  competitionTitle: string
  competitionGroupId?: string | null
  userId: string
}

export function SubmitEntryButton({
  competitionId,
  competitionTitle,
  competitionGroupId,
  userId,
}: SubmitEntryButtonProps) {
  const supabase = createClient()
  const router = useRouter()
  const [showRecorder, setShowRecorder] = useState(false)
  const [entryError, setEntryError] = useState('')

  async function handlePosted(whistle: CreatedWhistle) {
    const { error } = await supabase.from('competition_entries').insert({
      competition_id: competitionId,
      user_id: userId,
      whistle_id: whistle.id,
    })

    if (error) {
      setEntryError(`Seu post foi publicado, mas não entrou na competição: ${error.message}`)
      setShowRecorder(false)
      router.refresh()
      return
    }

    setEntryError('')
    setShowRecorder(false)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setShowRecorder(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 py-3 font-semibold text-white transition-colors hover:bg-emerald-400"
      >
        <Mic size={18} />
        Participar com meu post
      </button>
      {entryError && (
        <p className="mt-3 text-sm text-amber-400">{entryError}</p>
      )}
      {showRecorder && (
        <WhistleRecorderSheet
          userId={userId}
          groupId={competitionGroupId ?? undefined}
          destinationLabel={`Competição: ${competitionTitle}`}
          onClose={() => setShowRecorder(false)}
          onPosted={handlePosted}
        />
      )}
    </>
  )
}
