'use client'

import { useState } from 'react'
import { Mic } from 'lucide-react'
import { WhistleRecorderSheet } from '@/components/audio/WhistleRecorderSheet'

interface PostButtonProps {
  userId: string | null
}

export function PostButton({ userId }: PostButtonProps) {
  const [open, setOpen] = useState(false)

  if (!userId) return null

  return (
    <>
      {/* Mobile FAB */}
      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-20 right-4 z-50 w-14 h-14 bg-emerald-500 hover:bg-emerald-400 rounded-full shadow-lg flex items-center justify-center transition-colors"
        aria-label="Publicar no Fiufeed"
      >
        <Mic size={24} className="text-white" />
      </button>

      {/* Desktop inline button in sidebar is handled separately; this FAB shows on mobile */}
      {open && (
        <WhistleRecorderSheet
          userId={userId}
          destinationLabel="Fiufeed"
          onClose={() => setOpen(false)}
          onPosted={async () => setOpen(false)}
        />
      )}
    </>
  )
}
