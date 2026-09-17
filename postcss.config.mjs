/**
 * Indica ao editor e às ferramentas de desenvolvimento que o objeto
 * "config" segue o formato de configuração esperado pelo PostCSS.
 *
 * O import() é usado apenas para obter o tipo da configuração.
 * Ele não executa uma importação comum em tempo de execução.
 *
 * @type {import('postcss-load-config').Config}
 */

/**
 * Objeto principal de configuração do PostCSS.
 */
const config = {
  /**
   * Lista de plugins que serão utilizados pelo PostCSS.
   */
  plugins: {
    /**
     * Plugin oficial que integra o Tailwind CSS ao PostCSS.
     *
     * As chaves vazias ({}) indicam que o plugin está sendo utilizado
     * com as opções padrão, sem configurações adicionais.
     */
    '@tailwindcss/postcss': {},
  },
}

/**
 * Exporta a configuração como padrão do arquivo.
 *
 * Dessa forma, o PostCSS e as ferramentas do projeto conseguem
 * encontrar e utilizar automaticamente essa configuração.
 */
export default config