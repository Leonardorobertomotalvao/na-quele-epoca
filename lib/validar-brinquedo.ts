// ============================================================
// NA MINHA ÉPOCA — lib/validar-brinquedo.ts
// ============================================================
// Validações do envio de brinquedos da Oficina pela comunidade
// (usuários) e da edição/aprovação pela administração.
//
// A validação acontece sempre no servidor. O formulário também
// valida no navegador para guiar o usuário, mas o servidor
// nunca confia no cliente.
// ============================================================

import { verificarTexto } from '@/lib/moderacao-texto'
import { imagemValida } from '@/lib/validar-brincadeira'

/**
 * Níveis de dificuldade; guardados como no banco.
 */
export const DIFICULDADES_VALIDAS = [
  'FACIL',
  'INTERMEDIARIO',
  'AVANCADO',
] as const

/**
 * Rótulos amigáveis por nível de dificuldade.
 */
export const DIFICULDADES_LABEL: Record<
  (typeof DIFICULDADES_VALIDAS)[number],
  string
> = {
  FACIL: 'Fácil',
  INTERMEDIARIO: 'Intermediário',
  AVANCADO: 'Avançado',
}

/**
 * Limites de tamanho de cada campo do brinquedo.
 */
export const LIMITES_BRINQUEDO = {
  name: { min: 3, max: 60 },
  description: { min: 10, max: 600 },
  image: { max: 2048 },
  materials: { minItens: 1, maxItens: 10, itemMin: 2, itemMax: 40 },
  tools: { minItens: 0, maxItens: 8, itemMin: 2, itemMax: 40 },
  steps: { minItens: 1, maxItens: 20, itemMin: 4, itemMax: 400 },
  timeLabel: { min: 1, max: 40 },
  benefits: { minItens: 0, maxItens: 8, itemMin: 2, itemMax: 60 },
  alternatives: { minItens: 0, maxItens: 8, itemMin: 3, itemMax: 120 },
  safety: { min: 10, max: 600 },
  minAge: { min: 3, max: 99 },
  players: { min: 1, max: 50 },
}

export type BrinquedoValido = {
  name: string
  image: string | null
  description: string
  materials: string[]
  tools: string[]
  steps: string[]
  timeLabel: string
  difficulty: (typeof DIFICULDADES_VALIDAS)[number]
  minAge: number
  players: number | null
  benefits: string[]
  alternatives: string[]
  safety: string
  supervision: boolean
}

export type ResultadoValidacaoBrinquedo =
  | { ok: true; dados: BrinquedoValido }
  | { ok: false; erro: string }

function comoString(valor: unknown): string {
  return typeof valor === 'string' ? valor.trim() : ''
}

function comoLista(
  valor: unknown,
  limites: { minItens: number; maxItens: number; itemMin: number; itemMax: number }
): { lista: string[]; erro: string | null } {
  const bruto = Array.isArray(valor) ? valor : []
  const lista = bruto
    .map((item) => comoString(item))
    .filter(Boolean)
    .slice(0, limites.maxItens)

  if (lista.length < limites.minItens) {
    return {
      lista,
      erro: `Precisa de pelo menos ${limites.minItens} ${limites.minItens === 1 ? 'item' : 'itens'}.`,
    }
  }

  const invalido = lista.find(
    (item) => item.length < limites.itemMin || item.length > limites.itemMax
  )

  if (invalido) {
    return {
      lista,
      erro: `Cada item deve ter entre ${limites.itemMin} e ${limites.itemMax} caracteres.`,
    }
  }

  return { lista, erro: null }
}

/**
 * Valida o corpo de envio/edição de um brinquedo.
 * Devolve os campos prontos pro banco ou uma mensagem
 * amigável em português.
 */
export function validarBrinquedo(
  corpo: unknown
): ResultadoValidacaoBrinquedo {
  const dados = (corpo ?? {}) as Record<string, unknown>

  // ---------- Nome ----------
  const name = comoString(dados.name)
  if (name.length < LIMITES_BRINQUEDO.name.min) {
    return {
      ok: false,
      erro: 'O nome do brinquedo precisa ter pelo menos 3 letras.',
    }
  }
  if (name.length > LIMITES_BRINQUEDO.name.max) {
    return {
      ok: false,
      erro: 'O nome pode ter no máximo 60 caracteres.',
    }
  }

  // ---------- Imagem ----------
  const imageBruta = comoString(dados.image)
  if (imageBruta && !imagemValida(imageBruta)) {
    return {
      ok: false,
      erro:
        'A imagem precisa ser enviada pelo site (fale com o suporte se este aviso aparecer).',
    }
  }
  const image = imageBruta || null

  // ---------- Descrição ----------
  const description = comoString(dados.description)
  if (description.length < LIMITES_BRINQUEDO.description.min) {
    return {
      ok: false,
      erro: 'Escreva uma descrição com pelo menos 10 letras.',
    }
  }
  if (description.length > LIMITES_BRINQUEDO.description.max) {
    return {
      ok: false,
      erro: 'A descrição pode ter no máximo 600 caracteres.',
    }
  }

  // ---------- Materiais ----------
  const materiais = comoLista(dados.materials, LIMITES_BRINQUEDO.materials)
  if (materiais.erro) {
    return {
      ok: false,
      erro: materiais.erro.startsWith('Precisa')
        ? 'Marque pelo menos um material necessário.'
        : materiais.erro.replace(
            'Cada item',
            'Cada material'
          ),
    }
  }

  // ---------- Ferramentas ----------
  const ferramentas = comoLista(dados.tools, LIMITES_BRINQUEDO.tools)
  if (ferramentas.erro) {
    return {
      ok: false,
      erro: ferramentas.erro.replace('Cada item', 'Cada ferramenta'),
    }
  }

  // ---------- Passos ----------
  const passos = comoLista(dados.steps, LIMITES_BRINQUEDO.steps)
  if (passos.erro) {
    return {
      ok: false,
      erro: passos.erro.startsWith('Precisa')
        ? 'Escreva pelo menos um passo de montagem.'
        : passos.erro.replace('Cada item', 'Cada passo'),
    }
  }

  // ---------- Tempo ----------
  const timeLabel = comoString(dados.timeLabel)
  if (
    timeLabel.length < LIMITES_BRINQUEDO.timeLabel.min ||
    timeLabel.length > LIMITES_BRINQUEDO.timeLabel.max
  ) {
    return {
      ok: false,
      erro: 'Informe um tempo estimado (ex.: "15 minutos").',
    }
  }

  // ---------- Dificuldade ----------
  const difficulty = comoString(dados.difficulty)
  if (!DIFICULDADES_VALIDAS.some((d) => d === difficulty)) {
    return {
      ok: false,
      erro: 'Escolha a dificuldade do brinquedo.',
    }
  }

  // ---------- Idade ----------
  const minAge = Number(dados.minAge)
  if (
    !Number.isInteger(minAge) ||
    minAge < LIMITES_BRINQUEDO.minAge.min ||
    minAge > LIMITES_BRINQUEDO.minAge.max
  ) {
    return {
      ok: false,
      erro: 'Informe uma idade mínima recomendada entre 3 e 99.',
    }
  }

  // ---------- Participantes (opcional) ----------
  const playersBruto = Number(dados.players)
  const players =
    dados.players === undefined ||
    dados.players === null ||
    dados.players === ''
      ? null
      : Number.isInteger(playersBruto) &&
          playersBruto >= LIMITES_BRINQUEDO.players.min &&
          playersBruto <= LIMITES_BRINQUEDO.players.max
        ? playersBruto
        : null

  if (
    dados.players !== undefined &&
    dados.players !== null &&
    dados.players !== '' &&
    players === null
  ) {
    return {
      ok: false,
      erro: 'Informe o número de participantes entre 1 e 50.',
    }
  }

  // ---------- Benefícios ----------
  const beneficios = comoLista(dados.benefits, LIMITES_BRINQUEDO.benefits)
  if (beneficios.erro) {
    return {
      ok: false,
      erro: beneficios.erro.replace('Cada item', 'Cada benefício'),
    }
  }

  // ---------- Alternativas ----------
  const alternativas = comoLista(
    dados.alternatives,
    LIMITES_BRINQUEDO.alternatives
  )
  if (alternativas.erro) {
    return {
      ok: false,
      erro: alternativas.erro.replace(
        'Cada item',
        'Cada alternativa'
      ),
    }
  }

  // ---------- Segurança ----------
  const safety = comoString(dados.safety)
  if (safety.length < LIMITES_BRINQUEDO.safety.min) {
    return {
      ok: false,
      erro:
        'Escreva as recomendações de segurança (pelo menos 10 caracteres).',
    }
  }
  if (safety.length > LIMITES_BRINQUEDO.safety.max) {
    return {
      ok: false,
      erro: 'As recomendações de segurança podem ter no máximo 600 caracteres.',
    }
  }

  // ---------- Supervisão ----------
  const supervision =
    dados.supervision === true || dados.supervision === 'true'

  // ---------- Moderação automática ----------
  const textoCompleto = [
    name,
    description,
    timeLabel,
    safety,
    ...materiais.lista,
    ...ferramentas.lista,
    ...passos.lista,
    ...beneficios.lista,
    ...alternativas.lista,
  ].join(' ')

  if (verificarTexto(textoCompleto).nivel === 'BLOQUEADO') {
    return {
      ok: false,
      erro:
        'Não podemos aceitar este texto. Revise as palavras e descreva o brinquedo de forma gentil.',
    }
  }

  return {
    ok: true,
    dados: {
      name,
      image,
      description,
      materials: materiais.lista,
      tools: ferramentas.lista,
      steps: passos.lista,
      timeLabel,
      difficulty: difficulty as BrinquedoValido['difficulty'],
      minAge,
      players,
      benefits: beneficios.lista,
      alternatives: alternativas.lista,
      safety,
      supervision,
    },
  }
}
