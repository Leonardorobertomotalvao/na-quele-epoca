// ============================================================
// NA MINHA ÉPOCA — lib/search.ts
// ============================================================
// Pesquisa da página inicial:
// - funciona com ou sem acentos
// - aceita maiúsculas/minúsculas de qualquer forma
// - aceita partes do nome ("amare" encontra "Amarelinha")
// - reconhece apelidos/termos relacionados de brincadeiras
//   tradicionais brasileiras
// ============================================================

/**
 * Normaliza um texto para busca:
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
 * Apelidos conhecidos. Chave e valores já normalizados
 * (sem acento e minúsculos). Exemplo: quem pesquisa
 * "corre corre" encontra "Pega-pega".
 */
const SINONIMOS: string[][] = [
  ['pega-pega', 'pega pega', 'corre corre', 'bera bera', 'queimada'],
  ['esconde-esconde', 'esconde esconde', 'esconde', 'lerdadeira', 'pique'],
  ['cabo de guerra', 'cabo guerra', 'corda guerra', 'puxa puxa'],
  ['corrida do saco', 'corrida saco', 'corrida de sacos', 'corrida no saco'],
  ['amarelinha', 'macaca', 'raio', 'sapata', 'amarelinhas'],
  ['bolinha de gude', 'bolinha gude', 'gude', 'bola de gude', 'bolas de vidro'],
  ['pular corda', 'pula corda', 'corda'],
  ['piao', 'trompo', 'trompos'],
]

/**
 * Devolve os termos relacionados ao nome dado (que já vem
 * normalizado). Devolve também o próprio nome para o texto
 * de busca ficar completo.
 */
export function nomesRelacionados(nomeNormalizado: string): string[] {
  for (const grupo of SINONIMOS) {
    const confere = grupo.some(
      (variacao) =>
        variacao.length >= 3 &&
        (nomeNormalizado.includes(variacao) || variacao.includes(nomeNormalizado))
    )

    if (confere) {
      return grupo
    }
  }

  return []
}
