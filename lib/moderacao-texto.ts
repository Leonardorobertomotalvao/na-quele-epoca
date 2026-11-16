// ============================================================
// NA MINHA ÉPOCA — lib/moderacao-texto.ts
// ============================================================
// Motor de moderação automática de texto da comunidade.
//
// MISSÃO
// - Bloquear (antes de publicar) mensagens claramente impróprias:
//   palavrões, insultos dirigidos, ameaças, discurso de ódio,
//   conteúdo sexual explícito.
// - Deixar para revisão humana (status oculto + central de
//   moderação) mensagens apenas SUSPEITAS — nunca excluir
//   automaticamente.
// - Resistir a tentativas de burlar (leetspeak, letras espaçadas,
//   letras repetidas, abreviações).
// - Evitar falsos positivos de conversas educativas: frases como
//   "na escola aprendemos a não usar palavrões" não devem ser
//   censuradas.
//
// IMPORTANTE: nenhuma decisão automática exclui conteúdo.
// BLOQUEADO  = mensagem não entra na comunidade (usuário reescreve).
// SUSPEITO   = mensagem fica oculta aguardando análise do admin.
// ============================================================

export type NivelModeracao = 'OK' | 'SUSPEITO' | 'BLOQUEADO'

export type CategoriaInfracao =
  | 'LINGUAGEM_OFENSIVA'
  | 'ATAQUE_PESSOAL'
  | 'AMEACA'
  | 'DISCURSO_ODIO'
  | 'CONTEUDO_SEXUAL'
  | 'SPAM'

export type Severidade = 'bloqueio' | 'observacao'

export type RegraAcionada = {
  categoria: CategoriaInfracao
  severidade: Severidade
  /** Termo normalizado que provocou a marcação. */
  termo: string
  /** Pequeno trecho do texto original (para a central de moderação). */
  trecho: string
  /** Variante em que a detecção ocorreu (diagnóstico). */
  via: 'normal' | 'colada' | 'compacta' | 'colada-compacta' | 'total'
  /** Variante de onde o trecho veio (uso interno da promoção). */
  fonte?: string
}

export type ResultadoModeracao = {
  nivel: NivelModeracao
  categorias: CategoriaInfracao[]
  regras: RegraAcionada[]
  mensagem: string | null
}

/* ============================================================
   NORMALIZAÇÃO
   ============================================================ */

/**
 * Letras "parecidas" (cirílico/grego + símbolos) que costumam
 * ser usadas para bypass.
 */
const CONFUSAVEIS: Record<string, string> = {
  а: 'a', е: 'e', о: 'o', р: 'p', с: 'c', х: 'x', у: 'y', і: 'i',
  д: 'a', ѕ: 's', α: 'a', ο: 'o', ι: 'i',
  '$': 's', '€': 'e',
}

function decodificarEntreLetras(texto: string): string {
  /** Desfizes que valem junto a qualquer conector de palavra:
   *  dígitos leet + arroba + cifrão. */
  const MAPA_CONECTOR: Record<string, string> = {
    '0': 'o',
    '1': 'i',
    '3': 'e',
    '4': 'a',
    '5': 's',
    '7': 't',
    '@': 'a',
    $: 's',
  }

  /** Símbolos viram letra APENAS entre letras (v!ado -> viado),
   *  para não estragar exclamações normais ("sim!"). */
  const MAPA_ENTRE_LETRAS: Record<string, string> = {
    '!': 'i',
    '|': 'i',
    '¦': 'i',
  }

  let saida = ''

  for (let i = 0; i < texto.length; i += 1) {
    const caractere = texto[i]
    const antes = texto[i - 1]
    const depois = texto[i + 1]

    const eLetraPos = (c: string | undefined) =>
      typeof c === 'string' && /^[a-z]$/.test(c)
    const alfanumericoDepois =
      typeof depois === 'string' && /^[a-z0-9]$/.test(depois)

    const entreLetras = eLetraPos(antes) && eLetraPos(depois)
    // letra antes + fim de palavra (espaço/pontuação/fim):
    // "c4r4lh0" -> "caralho"; "100" NÃO muda (não começa com letra).
    const noFimDaPalavra = eLetraPos(antes) && !alfanumericoDepois

    if (entreLetras) {
      saida +=
        MAPA_CONECTOR[caractere] ??
        MAPA_ENTRE_LETRAS[caractere] ??
        caractere
    } else if (noFimDaPalavra) {
      saida += MAPA_CONECTOR[caractere] ?? caractere
    } else {
      saida += caractere
    }
  }

  return saida
}

/** Passo 1: texto pronto para trocas de palavras (com espaços). */
function normalizarBase(texto: string): string {
  let limpo = (texto || '').toLowerCase()

  // confusáveis unicode -> ascii
  limpo = limpo
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split('')
    .map((c) => CONFUSAVEIS[c] ?? c)
    .join('')

  // leetspeak contextual
  limpo = decodificarEntreLetras(limpo)

  // "!ado" -> depois do decode sobram símbolos: separar como espaço
  limpo = limpo
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return limpo
}

/** Passo 2: colapsa repetições exageradas da MESMA letra (3+ -> 2). */
function compactarRepeticoes(texto: string): string {
  return texto.replace(/(.)\1{2,}/g, '$1$1')
}

/**
 * Passo 3: cola cadeias de LETRAS SOLTAS ("b u r r o" -> "burro").
 * Regra: só junta tokens de UMA letra em sequência — palavras
 * normais ("voce", "um") nunca entram na colagem, para não
 * criar blobs sem fronteiras de palavra.
 */
function colarLetrasSoltas(base: string): string {
  const tokens = base.split(' ').filter(Boolean)
  const saida: string[] = []

  let cadeia: string[] = []

  function esvaziar() {
    if (cadeia.length >= 2) {
      saida.push(cadeia.join(''))
    } else if (cadeia.length === 1) {
      saida.push(cadeia[0])
    }
    cadeia = []
  }

  for (const token of tokens) {
    if (token.length === 1) {
      cadeia.push(token)
    } else {
      esvaziar()
      saida.push(token)
    }
  }

  esvaziar()
  return compactarRepeticoes(saida.join(' '))
}

/* ============================================================
   LISTAS DE TERMOS
   ============================================================
   Formato: termo normalizado (sem acento, minúsculo).
   Cada termo pode declarar:
   - severidade: bloqueio | observacao (obrigatória)
   - total: procura também na versão sem espaços (reservada a
     termos longos, para evitar casar dentro de palavras comuns)
   ============================================================ */

type EntradaTermo = [termo: string, severidade: Severidade, total?: boolean]

/** Palavrões e xingamentos em nível de bloqueio imediato. */
const PALAVRAO_BLOQUEIO: EntradaTermo[] = [
  ['caralho', 'bloqueio', true],
  ['porra', 'bloqueio'],
  ['buceta', 'bloqueio', true],
  ['fdp', 'bloqueio'],
  ['pqp', 'bloqueio'],
  ['vsf', 'bloqueio'],
  ['krl', 'bloqueio'],
  ['foder', 'bloqueio'],
  ['fodase', 'bloqueio'],
  ['fodido', 'bloqueio'],
  ['puta que pariu', 'bloqueio'],
  ['puteiro', 'bloqueio'],
  ['arrombado', 'bloqueio'],
  ['viado', 'bloqueio'],
  ['retardado', 'bloqueio'],
  ['mongoloide', 'bloqueio'],
]

/** Palavrões/insultos leves — viram SUSPEITO (revisão humana). */
const PALAVRAO_OBSERVACAO: EntradaTermo[] = [
  ['merda', 'observacao'],
  ['bosta', 'observacao'],
  ['idiota', 'observacao'],
  ['estupido', 'observacao'],
  ['imbecil', 'observacao'],
  ['otario', 'observacao'],
  ['babaca', 'observacao'],
  ['cretino', 'observacao'],
  ['burro', 'observacao'],
  ['besta', 'observacao'],
  ['desgracado', 'observacao'],
  ['mentiroso', 'observacao'],
  ['vadio', 'observacao'],
  ['vadia', 'observacao'],
  ['piranha', 'observacao'],
]

/** Conteúdo sexual explícito — bloqueio. */
const SEXUAL_BLOQUEIO: EntradaTermo[] = [
  ['porno', 'bloqueio', true],
  ['pornografia', 'bloqueio', true],
  ['hentai', 'bloqueio', true],
  ['transar', 'observacao', true],
  ['punheta', 'bloqueio', true],
  ['boquete', 'bloqueio', true],
  ['sexo com crianca', 'bloqueio', true],
]

/** Ameaças e intimidação — bloqueio (frases). */
const AMEACA_BLOQUEIO: EntradaTermo[] = [
  ['vou te matar', 'bloqueio'],
  ['vamos te matar', 'bloqueio'],
  ['te matar', 'bloqueio'],
  ['te bater', 'bloqueio'],
  ['te machucar', 'bloqueio'],
  ['te achar', 'bloqueio'],
  ['te encontrar', 'bloqueio'],
  ['te quebrar', 'bloqueio'],
  ['se mata', 'bloqueio'],
  ['vai morrer', 'bloqueio'],
]

/** Discurso de ódio — bloqueio (frases de inferiorização). */
const ODIO_BLOQUEIO: EntradaTermo[] = [
  ['raca inferior', 'bloqueio'],
  ['povo inferior', 'bloqueio'],
  ['deveriam morrer', 'bloqueio'],
  ['deviam morrer', 'bloqueio'],
  ['deveriam sumir', 'bloqueio'],
  ['deviam sumir', 'bloqueio'],
  ['povo errado', 'bloqueio'],
  ['tipo de gente assim', 'bloqueio'],
  ['nazista', 'observacao', true],
]

/* ============================================================
   RESCATES DE FALSO POSITIVO (contexto educativo / negativo /
   expressões de brincadeira)
   ============================================================ */

/**
 * Se uma dessas expressões aparece perto do termo marcado, o
 * aviso é descartado (conversa educativa/metalinguística).
 * IMPORTANTE: escritas SEM ACENTO (o texto analisado é desacentuado).
 */
const RESCATE_EDUCATIVO = [
  ' nao ',
  ' sem ',
  ' nunca ',
  ' evita ',
  ' evitar ',
  ' evite ',
  ' combata ',
  ' combater ',
  ' respeite ',
  ' respeitar ',
  ' respeito ',
  ' aula ',
  ' aulas ',
  ' escola ',
  ' professor ',
  ' professora ',
  ' proibido ',
  ' aprendi ',
  ' aprender ',
  ' cuidado ',
  ' gentil ',
  ' educacao ',
  ' licao ',
  ' animal ',
  ' fazenda ',
]

/**
 * Rescates específicos de ameaça: expressões que usam as mesmas
 * palavras brincando ("tenho fome de rir", "vai morrer... no jogo").
 */
const RESCATE_AMEACA = [
  ' de rir ',
  ' de riso ',
  ' risada ',
  ' zoeira ',
  ' brincando ',
  ' brincadeira ',
  ' no jogo ',
  ' no videogame ',
]

/* ============================================================
   DETECÇÃO
   ============================================================ */

/** Escapa para uso em regex. */
function escapar(termo: string): string {
  return termo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Regex "tolerante": cada letra pode aparecer 1 a 3 vezes
 * ("caralho" casa com "caralhho", "caaralho" etc.).
 */
function regexTolerante(termo: string): RegExp {
  const letras = termo.split('')
  const corpo = letras
    .map((l) => (l === ' ' ? `\\s{1,4}` : `${escapar(l)}{1,3}`))
    .join('')
  return new RegExp(corpo)
}

/** Diz se o termo está delimitado por não-letras (palavra inteira). */
function casarComFronteira(regex: RegExp, texto: string, termo: string) {
  const espaco = ` ${texto} `
  const match = espaco.match(regex)
  if (!match || match.index === undefined) {
    return null
  }
  const inicio = match.index - 1
  const fim = match.index + match[0].length
  const antes = espaco[inicio] ?? ' '
  const depois = espaco[fim] ?? ' '

  // só aceita casamento "palavra inteira" (ou dentro de pontuação)
  const eFronteirado =
    /[^a-z0-9]/.test(antes) &&
    /[^a-z0-9]/.test(depois) &&
    Math.abs(match[0].replace(/\s/g, '').length - termo.length) <=
      Math.max(2, Math.ceil(termo.length / 4))

  return eFronteirado
    ? {
        /**
         * A string de casamento tem 1 espaço de casca antes do
         * texto real; os índices volvem para o texto SEM a casca.
         */
        inicio: Math.max(0, match.index - 1),
        fim: Math.max(0, match.index + match[0].length - 1),
        casado: match[0],
      }
    : null
}

/**
 * Procura pelo termo em TODAS as variantes do texto.
 * Devolve o casamento resumido ou null.
 */
function procurarTermo(
  termo: string,
  variantes: {
    normal: string
    colada: string
    normalCompacta: string
    coladaCompacta: string
    total: string
  },
  aceitarTotal: boolean
): {
  via: RegraAcionada['via']
  /** Texto (variante) em que o casamento aconteceu. */
  fonte: string
  posInicio: number
  posFim: number
} | null {
  const regex = regexTolerante(termo)

  const tentativas = [
    { texto: ` ${variantes.normal} `, via: 'normal' as const },
    {
      texto: ` ${variantes.normalCompacta} `,
      via: 'compacta' as const,
    },
    { texto: ` ${variantes.colada} `, via: 'colada' as const },
    {
      texto: ` ${variantes.coladaCompacta} `,
      via: 'colada-compacta' as const,
    },
  ]

  for (const tentativa of tentativas) {
    const achado = casarComFronteira(regex, tentativa.texto, termo)
    if (achado) {
      return {
        via: tentativa.via,
        fonte: tentativa.texto,
        posInicio: achado.inicio,
        posFim: achado.fim,
      }
    }
  }

  if (aceitarTotal) {
    const totalMatch = variantes.total.match(regex)
    if (totalMatch) {
      return {
        via: 'total',
        fonte: variantes.total,
        posInicio: totalMatch.index ?? 0,
        posFim: (totalMatch.index ?? 0) + totalMatch[0].length,
      }
    }
  }

  return null
}

/** Recorta trecho legível ao redor da ocorrência (diagnóstico). */
function recortarTrecho(
  fonte: string,
  inicio: number,
  fim: number
): string {
  const de = Math.max(0, inicio - 24)
  const ate = Math.min(fonte.length, fim + 24)
  return fonte.slice(de, ate).replace(/\s+/g, ' ').trim()
}

/**
 * Confere se perto da posição existe palavra de resgate
 * (janela de texto antes/depois do termo).
 */
function temRescate(
  base: string,
  inicio: number,
  fim: number,
  rescates: string[]
): boolean {
  const aqui = ` ${base.slice(
    Math.max(0, inicio - 44),
    Math.min(base.length, fim + 14)
  )} `

  return rescates.some((resate) => aqui.includes(resate))
}

/* ============================================================
   SPAM
   ============================================================ */

interface SinaisSpam {
  regras: RegraAcionada[]
}

function detectarSpam(texto: string, base: string): SinaisSpam {
  const regras: RegraAcionada[] = []
  const semEspacos = texto.replace(/\s+/g, '')

  // ---------- links ----------
  const links = texto.match(/https?:\/\/\S+/gi) || []
  if (links.length >= 1) {
    const primeiroLink = links[0] ?? ''
    regras.push({
      categoria: 'SPAM',
      severidade: 'observacao',
      termo: links.length > 1 ? `${links.length} links` : 'link',
      trecho: primeiroLink.slice(0, 60),
      via: 'normal',
    })
  }

  // ---------- caixa alta gritando ----------
  const letras = texto.replace(/[^A-Za-zÀ-ÿ]/g, '')
  if (letras.length >= 25) {
    const maiusculas = letras.replace(/[^A-ZÀ-Ý]/g, '').length
    if (maiusculas / letras.length > 0.7) {
      regras.push({
        categoria: 'SPAM',
        severidade: 'observacao',
        termo: 'caixa alta',
        trecho: texto.slice(0, 60),
        via: 'normal',
      })
    }
  }

  // ---------- mesma letra repetida demais ----------
  if (/(.)\1{11,}/.test(semEspacos.toLowerCase())) {
    regras.push({
      categoria: 'SPAM',
      severidade: 'observacao',
      termo: 'letras repetidas',
      trecho: texto.slice(0, 60),
      via: 'normal',
    })
  }

  // ---------- mesma palavra muitas vezes ----------
  const tokens = base.split(' ').filter((t) => t.length > 2)
  const contagens = new Map<string, number>()
  for (const token of tokens) {
    contagens.set(token, (contagens.get(token) || 0) + 1)
  }
  for (const [palavra, vezes] of contagens) {
    if (vezes >= 6) {
      regras.push({
        categoria: 'SPAM',
        severidade: 'observacao',
        termo: `repetição: ${palavra}`,
        trecho: texto.slice(0, 60),
        via: 'normal',
      })
      break
    }
  }

  return { regras }
}

/* ============================================================
   MENSAGES
   ============================================================ */

const MENSAGES: Record<CategoriaInfracao, string> = {
  LINGUAGEM_OFENSIVA:
    'A sua mensagem não foi publicada porque contém palavras que podem ofender. Escreva de outro jeito, combinado?',
  ATAQUE_PESSOAL:
    'Não publicamos ataques a pessoas. Comente com respeito, por favor.',
  AMEACA: 'Não publicamos mensagens com ameaças ou intimidação.',
  DISCURSO_ODIO:
    'Não publicamos discurso de ódio. Aqui todo mundo brinca junto.',
  CONTEUDO_SEXUAL: 'Não publicamos conteúdo adulto ou inadequado.',
  SPAM: 'A sua mensagem parece spam. Evite links e repetições.',
}

/* ============================================================
   API PRINCIPAL
   ============================================================ */

function extraVariantes(texto: string) {
  const normal = normalizarBase(texto)
  const normalCompacta = compactarRepeticoes(normal)
  const colada = colarLetrasSoltas(normalizarBase(texto))
  const coladaCompacta = compactarRepeticoes(colada)
  const total = normalCompacta.replace(/\s+/g, '')
  return { normal, normalCompacta, colada, coladaCompacta, total }
}

/**
 * Diagnóstico/uso em testes: devolve as variantes de análise.
 */
export function variantesDeAnalise(texto: string) {
  return extraVariantes(texto)
}

/**
 * Classifica um texto para publicação na comunidade.
 * Nunca decide exclusão — isso é sempre humano.
 */
export function verificarTexto(texto: string): ResultadoModeracao {
  const original = (texto || '').trim()
  const { normal, normalCompacta, colada, coladaCompacta, total } =
    extraVariantes(original)

  const regras: RegraAcionada[] = []

  const grupos: {
    categoria: CategoriaInfracao
    entradas: EntradaTermo[]
    rescates: string[]
  }[] = [
    {
      categoria: 'LINGUAGEM_OFENSIVA',
      entradas: [...PALAVRAO_BLOQUEIO, ...PALAVRAO_OBSERVACAO],
      rescates: RESCATE_EDUCATIVO,
    },
    {
      categoria: 'CONTEUDO_SEXUAL',
      entradas: SEXUAL_BLOQUEIO,
      rescates: RESCATE_EDUCATIVO,
    },
    {
      categoria: 'AMEACA',
      entradas: AMEACA_BLOQUEIO,
      rescates: RESCATE_AMEACA,
    },
    {
      categoria: 'DISCURSO_ODIO',
      entradas: ODIO_BLOQUEIO,
      rescates: RESCATE_EDUCATIVO,
    },
  ]

  for (const grupo of grupos) {
    for (const [termo, severidade, totalFlag] of grupo.entradas) {
      const achado = procurarTermo(
        termo,
        { normal, normalCompacta, colada, coladaCompacta, total },
        Boolean(totalFlag)
      )
      if (!achado) {
        continue
      }

      let categoriaLocal = grupo.categoria
      let severidadeLocal = severidade

      /**
       * Promoção de insulto dirigido — ANTES do resgate:
       * "na escola, você é um idiota" continua sendo ataque.
       * Sinais de que estou falando COM uma pessoa:
       * 1. determinante grudado ("seu burro", "seu idiota");
       * 2. vocativo por Voce/tu/vc numa janela curta antes.
       */
      if (
        grupo.categoria === 'LINGUAGEM_OFENSIVA' &&
        severidadeLocal === 'observacao'
      ) {
        const fonte = achado.fonte
        const esquerda = fonte.slice(
          Math.max(0, achado.posInicio - 15),
          achado.posInicio
        )

        const grudado = /\b(seu|sua|teu|tua) +$/.test(esquerda)
        const vocativo = /\b(voce|vocees|vc|tu)\b/.test(
          ` ${fonte.slice(
            Math.max(0, achado.posInicio - 26),
            achado.posFim + 26
          )} `
        )

        if (grudado || vocativo) {
          severidadeLocal = 'bloqueio'
          categoriaLocal = 'ATAQUE_PESSOAL'
        }
      }

      // resgate de falso-positivo (não vale para ataque dirigido
      // e não aplica à variante "total", onde a janela seria o
      // texto inteiro e aboliria a proteção)
      if (
        categoriaLocal !== 'ATAQUE_PESSOAL' &&
        achado.via !== 'total' &&
        temRescate(
          achado.fonte,
          achado.posInicio,
          achado.posFim,
          grupo.rescates
        )
      ) {
        continue
      }

      regras.push({
        categoria: categoriaLocal,
        severidade: severidadeLocal,
        termo,
        trecho: recortarTrecho(achado.fonte, achado.posInicio, achado.posFim),
        via: achado.via,
        fonte: achado.fonte,
      })
    }
  }

  /* ---------- spam ---------- */
  const spam = detectarSpam(original, normal)
  regras.push(...spam.regras)

  /* ---------- resultado ---------- */
  const categorias = Array.from(new Set(regras.map((r) => r.categoria)))
  const temBloqueio = regras.some((r) => r.severidade === 'bloqueio')

  const nivel: NivelModeracao = temBloqueio
    ? 'BLOQUEADO'
    : regras.length > 0
      ? 'SUSPEITO'
      : 'OK'

  const primeiraBloqueada = regras.find((r) => r.severidade === 'bloqueio')
  const primeiraQualquer = regras[0]

  return {
    nivel,
    categorias,
    regras,
    mensagem:
      nivel === 'BLOQUEADO'
        ? MENSAGES[
            primeiraBloqueada?.categoria ?? 'LINGUAGEM_OFENSIVA'
          ]
        : nivel === 'SUSPEITO' && primeiraQualquer
          ? MENSAGES[primeiraQualquer.categoria]
          : null,
  }
}

/**
 * Texto curto explicando o resultado, para guardar na central de
 * moderação (ContentFlag.detalhes).
 */
export function detalhesDaModeracao(resultado: ResultadoModeracao): string {
  if (!resultado.regras.length) {
    return ''
  }

  return resultado.regras
    .map(
      (regra) =>
        `${regra.categoria}(${regra.severidade}, via ${regra.via}): ${regra.termo}${
          regra.trecho ? ` — "${regra.trecho.slice(0, 80)}"` : ''
        }`
    )
    .join(' | ')
}

/* ============================================================
   ENVIO REPETIDO (aplicado comparando com mensagens anteriores
   do MESMO usuário, nas rotas de API)
   ============================================================ */

export function pareceEnvioRepetido(
  texto: string,
  anteriores: string[]
): boolean {
  const base = normalizarBase(texto)
  if (!base) {
    return false
  }

  return anteriores.some((anterior) => {
    const antiga = normalizarBase(anterior)
    return antiga.length > 0 && antiga === base
  })
}

/* ============================================================
   MOTIVOS DE DENÚNCIA (títulos mostrados aos usuários)
   ============================================================ */

export const MOTIVOS_DENUNCIA = [
  'Xingamento ou ofensa',
  'Assédio ou bullying',
  'Ameaça',
  'Discurso de ódio',
  'Spam',
  'Conteúdo inadequado',
  'Outro',
] as const

export type MotivoDenuncia = (typeof MOTIVOS_DENUNCIA)[number]
