// ============================================================
// NA MINHA ÉPOCA — lib/oficina-materiais.ts
// ============================================================
// Materiais da Oficina compartilhados pela página e pelo
// servidor — fontes únicas de verdade para evitar desvios
// entre o catálogo fixo e os brinquedos da comunidade.
// ============================================================

export type MaterialOficina = {
  id: string
  label: string
  emoji: string
}

/**
 * Materiais canônicos da oficina (o mesmo conjunto usado
 * pela seleção "O que você tem por aí?" da página).
 */
export const MATERIAIS_OFICINA: MaterialOficina[] = [
  { id: 'papelao', label: 'Papelão', emoji: '📦' },
  { id: 'garrafa', label: 'Garrafa PET', emoji: '🧴' },
  { id: 'barbante', label: 'Barbante', emoji: '🧵' },
  { id: 'tampinhas', label: 'Tampinhas', emoji: '🔵' },
  { id: 'palitos', label: 'Palitos', emoji: '🪵' },
  { id: 'papel', label: 'Papel', emoji: '📄' },
  { id: 'fita', label: 'Fita adesiva', emoji: '🩹' },
  { id: 'tinta', label: 'Tinta', emoji: '🎨' },
  { id: 'latas', label: 'Latas', emoji: '🥫' },
  { id: 'copos', label: 'Copos', emoji: '🥤' },
]

export function materiaalDeId(id: string): MaterialOficina | null {
  return MATERIAIS_OFICINA.find((m) => m.id === id) ?? null
}

/**
 * Materiais recicláveis — garrafa PET, papelão, tampinhas e
 * latas definem os "brinquedos recicláveis" do filtro.
 */
const IDS_REICLAVEIS = ['papelao', 'garrafa', 'tampinhas', 'latas']

/**
 * Materiais "de casa" — quase todo mundo tem.
 */
const IDS_DE_CASA = ['barbante', 'palitos', 'papel', 'fita', 'tinta', 'copos']

function normalizarMaterias(valor: string): string {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
}

/** Recupera os ids conhecidos citados dentro de uma lista de materiais. */
function idsCitados(materials: string[], ids: string[]): string[] {
  const encontrados: string[] = []
  for (const material of materials) {
    const limpo = normalizarMaterias(material)
    for (const id of ids) {
      if (!encontrados.includes(id)) {
        if (limpo.includes(id) || id.includes(limpo)) {
          encontrados.push(id)
        }
      }
    }
  }
  return encontrados
}

/** O brinquedo usa pelo menos um material reciclável? */
export function usaMaterialReciclavel(materials: string[]): boolean {
  return idsCitados(materials, IDS_REICLAVEIS).length > 0
}

/** O brinquedo usa pelo menos um material que é "de casa"? */
export function usaMaterialDeCasa(materials: string[]): boolean {
  return idsCitados(materials, IDS_DE_CASA).length > 0
}

/** Precisa de ferramentas? */
export function precisaFerramentas(tools: string[]): boolean {
  return tools.filter(Boolean).length > 0
}

/**
 * Faixas etárias do filtro da Oficina.
 */
export const FAIXAS_ETARIAS = [
  { id: 'toda-familia', label: 'Toda a família' },
  { id: '5-8', label: '5 a 8 anos' },
  { id: '9-12', label: '9 a 12 anos' },
  { id: '13+', label: '13 anos ou mais' },
]

/** O brinquedo serve para a faixa etária escolhida? */
export function serveFaixaEtaria(minAge: number, faixa: string): boolean {
  if (faixa === 'toda-familia') {
    return true
  }
  if (faixa === '5-8') {
    return minAge <= 8 && minAge + 3 >= 5
  }
  if (faixa === '9-12') {
    return minAge <= 12 && minAge + 3 >= 9
  }
  if (faixa === '13+') {
    return minAge + 3 >= 13
  }
  return true
}
