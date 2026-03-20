export function extractLocationMeta(raw: string): { title: string; subtitle: string; body: string } {
  const source = raw || ''
  const titleMatch = source.match(/<[^>]*data-lotio-location-title=["']1["'][^>]*>([\s\S]*?)<\/[^>]+>/i)
  const subtitleMatch = source.match(/<[^>]*data-lotio-location-subtitle=["']1["'][^>]*>([\s\S]*?)<\/[^>]+>/i)

  const body = source
    .replace(/<[^>]*data-lotio-location-title=["']1["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .replace(/<[^>]*data-lotio-location-subtitle=["']1["'][^>]*>[\s\S]*?<\/[^>]+>/gi, '')
    .trim()

  const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()

  return {
    title: stripHtml(titleMatch?.[1] || ''),
    subtitle: stripHtml(subtitleMatch?.[1] || ''),
    body,
  }
}

export function sanitizeRichTextTheme(html: string): string {
  if (!html) return ''

  // Remove legacy <font> wrappers and color attributes that break the landing visual pattern.
  const withoutFontTags = html
    .replace(/<font\b[^>]*>/gi, '')
    .replace(/<\/font>/gi, '')
    .replace(/\scolor=(['"]).*?\1/gi, '')

  // Remove inline color/background declarations while preserving other style rules.
  return withoutFontTags.replace(/\sstyle=(['"])(.*?)\1/gi, (_match, quote: string, css: string) => {
    const filtered = css
      .split(';')
      .map((rule: string) => rule.trim())
      .filter(Boolean)
      .filter((rule: string) => !/^color\s*:/i.test(rule) && !/^background(?:-color)?\s*:/i.test(rule))

    if (!filtered.length) return ''
    return ` style=${quote}${filtered.join('; ')}${quote}`
  })
}

export function formatLocationText(body: string): string {
  const text = sanitizeRichTextTheme(body || '')
  if (!text) return ''

  // Se parece conter HTML estrutural gerado pelo editor, retorna como está e deixa o CSS cuidar dos espaçamentos
  if (text.includes('<p>') || text.includes('<div>') || text.includes('<ul>') || text.includes('<li>')) {
    return text
  }

  // Caso contrário, trata como texto puro (markdown simples ou rascunho sem HTML)
  // Converte quebras de linha em parágrafos, preservando linhas vazias como espaços
  return text
    .split('\n')
    .map((t: string) => `<p>${t.trim() || '&nbsp;'}</p>`)
    .join('')
}
