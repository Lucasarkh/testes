export const LOT_SEARCH_INTENT_OPTIONS = [
  { value: 'investir', label: 'Investir', description: 'Buscar potencial de valorizacao e renda.' },
  { value: 'morar', label: 'Morar', description: 'Priorizar o terreno ideal para construir e viver.' },
  { value: 'construir', label: 'Construir', description: 'Focar em medidas e atributos para o projeto.' },
  { value: 'revender', label: 'Revender', description: 'Avaliar liquidez e oportunidade de revenda.' },
  { value: 'avaliando', label: 'Ainda avaliando', description: 'Mapear opcoes antes de tomar a decisao final.' },
] as const

export type LotSearchIntent = (typeof LOT_SEARCH_INTENT_OPTIONS)[number]['value']

const LOT_SEARCH_INTENT_SET = new Set<string>(LOT_SEARCH_INTENT_OPTIONS.map((option) => option.value))

export const normalizeLotSearchIntent = (value: unknown): LotSearchIntent | '' => {
  const normalized = String(value ?? '').trim().toLowerCase()
  return LOT_SEARCH_INTENT_SET.has(normalized) ? normalized as LotSearchIntent : ''
}

export const getLotSearchIntentLabel = (value: string | null | undefined) => {
  return LOT_SEARCH_INTENT_OPTIONS.find((option) => option.value === value)?.label || 'Sem objetivo definido'
}