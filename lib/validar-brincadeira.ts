// ============================================================
// NA MINHA ÉPOCA — lib/validar-brincadeira.ts
// ============================================================
// Validações compartilhadas entre:
// - Envio de brincadeira pela comunidade (usuário).
// - Edição/aprovação pela área administrativa.
//
// Toda validação acontece no servidor. O formulário também
// valida no navegador para guiar o usuário, mas o servidor
// nunca confia no cliente.
// ============================================================

/**
 * Categorias válidas do catálogo.
 *
 * A categoria "Habilidade" substitui a categoria órfã encontrada
 * na auditoria (antigo valor solto de "Bolinha de gude") e passa
 * a ter seu próprio filtro na página inicial.
 */
export const CATEGORIAS_VALIDAS = [
  'Coordenação',
  'Criatividade',
  'Em Grupo',
  'Habilidade',
] as const

/**
 * Locais indicados para brincar.
 * Lista fechada para facilitar moderação e o filtro do catálogo.
 */
export const LOCAIS_VALIDOS = [
  'Casa ou sala',
  'Quintal',
  'Parque ou praça',
  'Rua ou calçada',
  'Escola',
  'Qualquer lugar',
] as const

/**
 * Limites de tamanho de cada campo.
 */
export const LIMITES = {
  name: { min: 3, max: 60 },
  desc: { min: 10, max: 500 },
  how: { min: 10, max: 2000 },
  materials: { min: 0, max: 300 },
  safety: { min: 0, max: 600 },
  benefits: { minItens: 0, maxItens: 8, itemMin: 2, itemMax: 40 },
  categories: { minItens: 1, maxItens: 4 },
  minPlayers: { min: 1, max: 50 },
  minAge: { min: 3, max: 99 },
  image: { max: 2048 },
}

export type BrincadeiraValida = {
  name: string
  image: string | null
  desc: string
  how: string
  materials: string
  location: string
  benefits: string[]
  minPlayers: number
  minAge: number
  categories: string[]
  safety: string
  supervision: boolean
}

export type ResultadoValidacao =
  | { ok: true; dados: BrincadeiraValida }
  | { ok: false; erro: string }

/**
 * Normaliza um texto para comparações:
 * - remove acentos (Amarelínha → amarelinha)
 * - converte para minúsculas
 * - colapsa espaços
 */
export function normalizarTexto(valor: string): string {
  return (valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
}

/**
 * Palavras bloqueadas na moderação. A lista é intencionalmente
 * curta e explícita; avaliações humanas (do administrador) são a
 * proteção principal — ela existe para barrar o mais grosseiro
 * antes de um humano precisar olhar.
 */
const TERMOS_PROIBIDOS = [
  'caralho',
  'buceta',
  'porra',
  'puta',
  'puto',
  'merda',
  'bosta',
  'otario',
  'idiota',
  'retardado',
  'babaca',
  'desgraca',
  'estupido',
]

/**
 * Verifica se o texto contém termos impróprios.
 * A comparação usa o texto normalizado para evitar
 * disfarces com acentos/maiúsculas.
 */
export function contemConteudoInadequado(texto: string): boolean {
  const normalizado = normalizarTexto(texto)
  return TERMOS_PROIBIDOS.some((termo) => normalizado.includes(termo))
}

/**
 * Verifica se a imagem enviada é uma URL válida do storage
 * do projeto (Vercel Blob). Isso impede que alguém aponte
 * imagens externas ou caminhos arbitrários.
 */
export function imagemValida(image: string): boolean {
  try {
    const url = new URL(image)
    return (
      image.length <= LIMITES.image.max &&
      url.protocol === 'https:' &&
      url.hostname.endsWith('.public.blob.vercel-storage.com')
    )
  } catch {
    return false
  }
}

function comoString(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

/**
 * Valida o corpo do envio/edição de uma brincadeira.
 * Retorna um objeto com todos os campos prontos para o banco
 * ou uma mensagem de erro amigável em português.
 */
export function validarBrincadeira(corpo: unknown): ResultadoValidacao {
  const dados = (corpo ?? {}) as Record<string, unknown>

  // ---------- Nome ----------
  const name = comoString(dados.name)
  if (name.length < LIMITES.name.min) {
    return { ok: false, erro: 'O nome da brincadeira precisa ter pelo menos 3 letras.' }
  }
  if (name.length > LIMITES.name.max) {
    return { ok: false, erro: 'O nome pode ter no máximo 60 caracteres.' }
  }

  // ---------- Imagem ----------
  const imageBruta = comoString(dados.image)
  if (imageBruta && !imagemValida(imageBruta)) {
    return {
      ok: false,
      erro: 'A imagem precisa ser enviada pelo site (fale com o suporte se este aviso aparecer).',
    }
  }
  const image = imageBruta || null

  // ---------- Descrição e modo de brincar ----------
  const desc = comoString(dados.desc)
  if (desc.length < LIMITES.desc.min) {
    return { ok: false, erro: 'Escreva uma descrição com pelo menos 10 letras.' }
  }
  if (desc.length > LIMITES.desc.max) {
    return { ok: false, erro: 'A descrição pode ter no máximo 500 caracteres.' }
  }

  const how = comoString(dados.how)
  if (how.length < LIMITES.how.min) {
    return { ok: false, erro: 'Explique como brincar com pelo menos 10 letras.' }
  }
  if (how.length > LIMITES.how.max) {
    return { ok: false, erro: 'O modo de brincar pode ter no máximo 2000 caracteres.' }
  }

  // ---------- Materiais / local ----------
  let materials = comoString(dados.materials)
  if (!materials) materials = 'Nenhum'
  if (materials.length > LIMITES.materials.max) {
    return { ok: false, erro: 'Os materiais podem ter no máximo 300 caracteres.' }
  }

  const location = comoString(dados.location)
  if (!LOCAIS_VALIDOS.some((local) => local === location)) {
    return { ok: false, erro: 'Escolha um local indicado da lista.' }
  }

  // ---------- Habilidades ----------
  const benefitsBruto = Array.isArray(dados.benefits) ? dados.benefits : []
  const benefits = benefitsBruto
    .map((item) => comoString(item))
    .filter(Boolean)
    .slice(0, LIMITES.benefits.maxItens)

  const beneficioInvalido = benefits.find(
    (item) => item.length < LIMITES.benefits.itemMin || item.length > LIMITES.benefits.itemMax
  )
  if (beneficioInvalido) {
    return { ok: false, erro: 'Cada habilidade deve ter entre 2 e 40 caracteres.' }
  }

  // ---------- Participantes e idade ----------
  const minPlayers = Number(dados.minPlayers)
  if (!Number.isInteger(minPlayers) || minPlayers < LIMITES.minPlayers.min || minPlayers > LIMITES.minPlayers.max) {
    return { ok: false, erro: 'Informe uma quantidade mínima de participantes entre 1 e 50.' }
  }

  const minAge = Number(dados.minAge)
  if (!Number.isInteger(minAge) || minAge < LIMITES.minAge.min || minAge > LIMITES.minAge.max) {
    return { ok: false, erro: 'Informe uma idade mínima recomendada entre 3 e 99.' }
  }

  // ---------- Categorias ----------
  const categoriesBruto = Array.isArray(dados.categories) ? dados.categories : []
  const categoriasLimpa = Array.from(
    new Set(categoriesBruto.map((item) => comoString(item)).filter(Boolean))
  )

  if (categoriasLimpa.length < LIMITES.categories.minItens) {
    return { ok: false, erro: 'Escolha pelo menos uma categoria.' }
  }
  if (categoriasLimpa.length > LIMITES.categories.maxItens) {
    return { ok: false, erro: 'Escolha no máximo 4 categorias.' }
  }
  if (categoriasLimpa.some((item) => !CATEGORIAS_VALIDAS.some((valida) => valida === item))) {
    return { ok: false, erro: 'Alguma categoria não é válida.' }
  }

  // ---------- Segurança ----------
  const safety = comoString(dados.safety).slice(0, LIMITES.safety.max)

  // ---------- Supervisão ----------
  const supervision = dados.supervision === true || dados.supervision === 'true'

  // ---------- Moderação básica ----------
  const textoCompleto = [name, desc, how, materials, location, safety, ...benefits].join(' ')
  if (contemConteudoInadequado(textoCompleto)) {
    return {
      ok: false,
      erro: 'Não podemos aceitar este texto. Revise as palavras e tente descrever a brincadeira de forma gentil.',
    }
  }

  return {
    ok: true,
    dados: {
      name,
      image,
      desc,
      how,
      materials,
      location,
      benefits,
      minPlayers,
      minAge,
      categories: categoriasLimpa,
      safety,
      supervision,
    },
  }
}
