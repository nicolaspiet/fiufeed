'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import { WhistleRecorderSheet } from '@/components/audio/WhistleRecorderSheet'

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
  const router = useRouter()
  const [showRecorder, setShowRecorder] = useState(false)

  async function handlePosted() {
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
      {showRecorder && (
        <WhistleRecorderSheet
          userId={userId}
          groupId={competitionGroupId ?? undefined}
          competitionId={competitionId}
          destinationLabel={`Competicao: ${competitionTitle}`}
          onClose={() => setShowRecorder(false)}
          onPosted={handlePosted}
        />
      )}
    </>
  )
}
