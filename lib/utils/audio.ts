export const MAX_DURATION_S = 180

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function getAudioStoragePath(userId: string, filename: string): string {
  return `${userId}/${Date.now()}-${filename}`
}
