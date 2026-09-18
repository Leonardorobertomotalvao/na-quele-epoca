/**
 * ============================================================
 * PROJETO: Na Minha Época
 * ARQUIVO: layout.tsx
 * ============================================================
 *
 * Este arquivo define o layout principal da aplicação Next.js.
 *
 * Ele é responsável por:
 * - Definir informações de SEO da página.
 * - Configurar o título e a descrição do site.
 * - Configurar os ícones da aplicação.
 * - Definir as configurações de viewport.
 * - Aplicar estilos globais.
 * - Exibir o conteúdo das páginas através de "children".
 * - Carregar o Analytics da Vercel em produção.
 * ============================================================
 */


/* ============================================================
   1. IMPORTAÇÕES
   ============================================================ */

/*
 * Importa o Analytics da Vercel.
 *
 * Ele permite acompanhar informações de acesso e uso do site.
 * Neste projeto, ele será carregado somente em produção.
 */
import { Analytics } from '@vercel/analytics/next'

/*
 * Importa o componente para voltar ao topo da página.
 */
import ScrollToTop from '../components/ui/ScrollToTop'
import { Providers } from './providers'

/*
 * Importa os tipos Metadata e Viewport do Next.js.
 *
 * Metadata:
 * Usado para configurar título, descrição, ícones e SEO.

 * Viewport:
 * Usado para configurar o comportamento visual da página
 * em dispositivos como celulares, tablets e computadores.
 */
import type { Metadata, Viewport } from 'next'


/*
 * Importa o arquivo de estilos globais.
 *
 * Esse arquivo pode conter:
 * - Reset de estilos.
 * - Variáveis de cores.
 * - Classes gerais.
 * - Estilos compartilhados por todas as páginas.
 */
import './globals.css'


/* ============================================================
   2. CONFIGURAÇÕES DE METADADOS / SEO
   ============================================================ */

/*
 * Define as informações principais exibidas pelos mecanismos
 * de busca e pela aba do navegador.
 *
 * O tipo Metadata ajuda o TypeScript a validar a estrutura.
 */
export const metadata: Metadata = {
  /*
   * Título principal do site.
   *
   * Aparece na aba do navegador e pode aparecer nos resultados
   * de pesquisa.
   */
  title: 'Na Minha Época — Brincadeiras que criam memórias',

  /*
   * Descrição do site.
   *
   * Ajuda a explicar para os mecanismos de busca e visitantes
   * qual é o objetivo do projeto.
   */
  description:
    'Descubra brincadeiras tradicionais brasileiras para aprender, se movimentar e criar memórias juntos.',

  /*
   * Ferramenta utilizada para gerar este projeto.
   *
   * Aqui está mantida a informação original do seu código.
   */
  generator: 'v0.app',

  /*
   * Ícones do site.
   *
   * O navegador pode escolher o ícone conforme o tema claro
   * ou escuro do sistema.
   */
  icons: {
    /*
     * Ícones principais do navegador.
     */
    icon: [
      {
        /*
         * Ícone usado quando o sistema está no tema claro.
         */
        url: '/icon-light-32x32.png',

        /*
         * Define a condição para utilizar este ícone.
         */
        media: '(prefers-color-scheme: light)',
      },
      {
        /*
         * Ícone usado quando o sistema está no tema escuro.
         */
        url: '/icon-dark-32x32.png',

        /*
         * Define a condição para utilizar este ícone.
         */
        media: '(prefers-color-scheme: dark)',
      },
      {
        /*
         * Ícone em formato SVG.
         *
         * O SVG é um formato vetorial que pode manter boa
         * qualidade em diferentes tamanhos.
         */
        url: '/icon.svg',

        /*
         * Informa ao navegador o tipo do arquivo.
         */
        type: 'image/svg+xml',
      },
    ],

    /*
     * Ícone utilizado por dispositivos Apple,
     * como iPhone e iPad, quando o site é adicionado
     * à tela inicial.
     */
    apple: '/apple-icon.png',
  },
}


/* ============================================================
   3. CONFIGURAÇÕES DO VIEWPORT
   ============================================================ */

/*
 * Define configurações visuais da página.
 *
 * colorScheme:
 * Indica que o site utiliza o esquema de cores claro.
 *
 * themeColor:
 * Define a cor principal utilizada pelo navegador
 * em elementos da interface, quando suportado.
 */
export const viewport: Viewport = {
  /*
   * Mantém o esquema de cores claro.
   */
  colorScheme: 'light',

  /*
   * Cor principal do projeto "Na Minha Época".
   *
   * Essa cor combina com o verde utilizado no cabeçalho
   * e nos demais elementos do site.
   */
  themeColor: '#16c978',
}



/* ============================================================
   4. LAYOUT PRINCIPAL DA APLICAÇÃO
   ============================================================ */

/*
 * RootLayout é o componente principal que envolve
 * todas as páginas da aplicação.
 *
 * children:
 * Representa o conteúdo da página atual.
 *
 * Readonly:
 * Indica que o objeto de propriedades não deve ser alterado.
 */
export default function RootLayout({
  children,
}: Readonly<{
  /*
   * React.ReactNode permite receber elementos React,
   * textos, fragmentos e outros conteúdos renderizáveis.
   */
  children: React.ReactNode
}>) {
  /*
   * Retorna a estrutura HTML base da aplicação.
   */
  return (
    /*
     * Define o idioma principal do site como português do Brasil.
     *
     * suppressHydrationWarning:
     * Permite que o next-themes altere o tema do HTML
     * sem gerar avisos de hidratação no Next.js.
     */
    <html lang="pt-BR" suppressHydrationWarning>
      {/*
       * Corpo principal da página.
       *
       * A classe "antialiased" suaviza a renderização
       * das fontes quando o Tailwind CSS está configurado.
       */}
      <body className="antialiased">

        {/*
         * Providers controla o tema claro e escuro
         * de toda a aplicação.
         */}
        <Providers>

          {/*
           * Renderiza o conteúdo das páginas dentro do layout.
           *
           * Tudo que estiver dentro deste RootLayout será
           * exibido neste ponto.
           */}
          {children}

          {/*
           * Carrega o Analytics somente quando o projeto
           * está rodando em ambiente de produção.
           */}
          {process.env.NODE_ENV === 'production' && <Analytics />}

          {/*
           * Renderiza o botão flutuante para voltar ao topo.
           */}
          <ScrollToTop />

        </Providers>

      </body>
    </html>
  )
}