/** @type {import('next').NextConfig} */
const nextConfig = {
  /**
   * Impede o Next de gerar AGENTS.md/CLAUDE.md a cada
   * `next dev` — arquivos gerados não precisam existir
   * no repositório.
   */
  agentRules: false,

  /**
   * ETAPA 6 (correção técnica): os erros de TypeScript voltam a
   * bloquear o build — antes, `ignoreBuildErrors: true` escondia
   * problemas reais de tipo. A checagem continua rodando a cada
   * build, honestamente.
   */
  images: {
    unoptimized: true,
  },
}

export default nextConfig
