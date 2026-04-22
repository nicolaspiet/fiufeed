'use client'

import { useEffect, useState } from 'react'
import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  endsAt: string
  label: string
}

export function CountdownTimer({ endsAt, label }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    function update() {
      const diff = new Date(endsAt).getTime() - Date.now()
      if (diff <= 0) {
        setExpired(true)
        setTimeLeft('Encerrado')
        return
      }

      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`)
    }

    update()
    const timerId = setInterval(update, 1000)
    return () => clearInterval(timerId)
  }, [endsAt])

  return (
    <div className="flex items-center gap-1.5 text-sm font-medium" style={{ color: expired ? 'var(--text-faint)' : '#34d399' }}>
      <Clock size={14} />
      <span>{label}: {timeLeft}</span>
    </div>
  )
}
