function isAbsoluteUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://')
}

export function extractAudioStoragePath(value: string) {
  if (!value) return null
  if (!isAbsoluteUrl(value)) return value

  try {
    const url = new URL(value)
    const marker = '/audio-whistles/'
    const markerIndex = url.pathname.indexOf(marker)
    if (markerIndex === -1) return null
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length))
  } catch {
    return null
  }
}

export async function createSignedAudioUrl(
  supabase: {
    storage: {
      from: (bucket: string) => {
        createSignedUrl: (path: string, expiresIn: number) => Promise<{ data: { signedUrl: string } | null; error: { message: string } | null }>
      }
    }
  },
  storedValue: string,
  expiresIn = 3600,
) {
  const path = extractAudioStoragePath(storedValue)
  if (!path) return storedValue

  const { data, error } = await supabase.storage.from('audio-whistles').createSignedUrl(path, expiresIn)
  if (error || !data?.signedUrl) {
    return storedValue
  }

  return data.signedUrl
}

export async function signAudioUrls<T extends { audio_url: string }>(
  supabase: Parameters<typeof createSignedAudioUrl>[0],
  items: T[],
) {
  return Promise.all(
    items.map(async (item) => ({
      ...item,
      audio_url: await createSignedAudioUrl(supabase, item.audio_url),
    }))
  )
}
