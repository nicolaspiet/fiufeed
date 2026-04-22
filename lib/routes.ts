export function slugify(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

export function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}

export function extractCompetitionPublicId(segment: string) {
  if (isUuid(segment)) return null

  const parts = segment.split('-').filter(Boolean)
  return parts.length === 0 ? segment : parts[parts.length - 1]
}

export function buildCompetitionPath(input: {
  id?: string | null
  slug?: string | null
  public_id?: string | null
  title?: string | null
}) {
  if (!input.public_id) {
    return `/competicoes/${input.id}`
  }

  const slugPart = input.slug || slugify(input.title ?? '') || 'competicao'
  return `/competicoes/${slugPart}-${input.public_id}`
}

export function buildWhistlePath(input: {
  id?: string | null
  public_id?: string | null
}) {
  return `/assobio/${input.public_id || input.id}`
}

export function buildGroupPath(input: {
  id?: string | null
  slug?: string | null
  name?: string | null
}) {
  return `/grupos/${input.slug || slugify(input.name ?? '') || input.id}`
}
