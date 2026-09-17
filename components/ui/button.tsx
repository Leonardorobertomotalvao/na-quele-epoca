/**
 * ============================================================
 * PROJETO: Na Minha Época
 * ARQUIVO: components/ui/button.tsx
 * ============================================================
 *
 * Este arquivo cria um componente de botão reutilizável.
 *
 * Ele permite:
 * - Usar diferentes estilos de botão.
 * - Usar diferentes tamanhos.
 * - Reutilizar classes CSS com o class-variance-authority.
 * - Aceitar as propriedades do botão do Base UI.
 * - Adicionar classes personalizadas através de "className".
 * ============================================================
 */


/* ============================================================
   1. IMPORTAÇÕES
   ============================================================ */

/*
 * Importa o componente Button do Base UI.
 *
 * O nome original "Button" é renomeado para
 * "ButtonPrimitive" para evitar conflito com o componente
 * Button criado neste arquivo.
 */
import { Button as ButtonPrimitive } from '@base-ui/react/button'


/*
 * Importa:
 *
 * cva:
 * Função que organiza classes CSS em variantes.
 *
 * VariantProps:
 * Tipo TypeScript que identifica automaticamente as opções
 * disponíveis nas variantes e nos tamanhos.
 */
import {
  cva,
  type VariantProps,
} from 'class-variance-authority'


/*
 * Importa a função "cn" criada no projeto.
 *
 * Normalmente, essa função é utilizada para combinar
 * classes CSS de maneira organizada.
 *
 * Exemplo:
 * cn('classe-base', className)
 */
import { cn } from '@/lib/utils'


/* ============================================================
   2. CONFIGURAÇÃO DAS VARIANTES DO BOTÃO
   ============================================================ */

/*
 * buttonVariants define todas as classes e opções
 * visuais disponíveis para o componente Button.
 *
 * A função cva recebe:
 *
 * 1. Classes base:
 *    Aplicadas em todos os botões.
 *
 * 2. Objeto de variantes:
 *    Define estilos diferentes para cada opção.
 *
 * 3. defaultVariants:
 *    Define os valores utilizados quando nenhuma variante
 *    ou tamanho é informado.
 */
const buttonVariants = cva(
  /*
   * ==========================================================
   * 2.1. CLASSES BASE
   * ==========================================================
   *
   * Estas classes são aplicadas a todos os botões.
   */
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",

  {
    variants: {

      /* ======================================================
         2.2. VARIANTES DE ESTILO
         ====================================================== */

      variant: {

        /*
         * default:
         * Estilo principal do botão.
         *
         * bg-primary:
         * Usa a cor principal do tema.
         *
         * text-primary-foreground:
         * Usa a cor de texto apropriada para o fundo.
         */
        default:
          'bg-primary text-primary-foreground [a]:hover:bg-primary/80',

        /*
         * outline:
         * Botão com borda e fundo transparente ou neutro.
         *
         * Também possui estilos para hover e estado expandido.
         */
        outline:
          'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50',

        /*
         * secondary:
         * Usa as cores secundárias do tema.
         *
         * É útil para ações menos importantes que o botão
         * principal.
         */
        secondary:
          'bg-secondary text-secondary-foreground hover:bg-secondary/80 aria-expanded:bg-secondary aria-expanded:text-secondary-foreground',

        /*
         * ghost:
         * Botão sem fundo permanente.
         *
         * O fundo aparece quando o usuário passa o mouse
         * ou quando o botão está expandido.
         */
        ghost:
          'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50',

        /*
         * destructive:
         * Estilo para ações destrutivas, como excluir ou remover.
         *
         * Utiliza as cores de destruição configuradas no tema.
         */
        destructive:
          'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40',

        /*
         * link:
         * Faz o botão parecer um link de texto.
         *
         * A linha aparece ao passar o mouse.
         */
        link:
          'text-primary underline-offset-4 hover:underline',
      },


      /* ======================================================
         2.3. VARIANTES DE TAMANHO
         ====================================================== */

      size: {

        /*
         * default:
         * Tamanho padrão do botão.
         *
         * h-8:
         * Altura do botão.
         *
         * gap-1.5:
         * Espaçamento entre texto e ícones.
         *
         * px-2.5:
         * Espaçamento horizontal interno.
         */
        default:
          'h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',

        /*
         * xs:
         * Botão extra pequeno.
         *
         * Também reduz o tamanho dos ícones SVG.
         */
        xs:
          "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",

        /*
         * sm:
         * Botão pequeno.
         *
         * Ideal para ações compactas e interfaces com pouco espaço.
         */
        sm:
          "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",

        /*
         * lg:
         * Botão grande.
         *
         * Mantém um espaçamento maior que o tamanho padrão.
         */
        lg:
          'h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2',

        /*
         * icon:
         * Botão quadrado para exibir somente um ícone.
         */
        icon:
          'size-8',

        /*
         * icon-xs:
         * Botão quadrado extra pequeno para ícones.
         */
        'icon-xs':
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",

        /*
         * icon-sm:
         * Botão quadrado pequeno para ícones.
         */
        'icon-sm':
          'size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg',

        /*
         * icon-lg:
         * Botão quadrado grande para ícones.
         */
        'icon-lg':
          'size-9',
      },
    },


    /* ========================================================
       2.4. VALORES PADRÃO
       ======================================================== */

    /*
     * Caso o componente seja usado sem informar "variant"
     * ou "size", estas opções serão aplicadas.
     */
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
)


/* ============================================================
   3. COMPONENTE BUTTON
   ============================================================ */

/*
 * Cria o componente Button que será utilizado em outras
 * partes do projeto.
 *
 * Props:
 * - className:
 *   Permite adicionar classes CSS personalizadas.
 *
 * - variant:
 *   Define o estilo visual do botão.
 *
 * - size:
 *   Define o tamanho do botão.
 *
 * - ...props:
 *   Recebe todas as outras propriedades aceitas pelo
 *   ButtonPrimitive do Base UI.
 *
 * VariantProps<typeof buttonVariants> faz o TypeScript
 * reconhecer automaticamente os valores válidos de
 * "variant" e "size".
 */
function Button({
  className,
  variant = 'default',
  size = 'default',
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {

  /*
   * Retorna o botão original do Base UI.
   *
   * O componente recebe:
   *
   * data-slot="button":
   * Identifica o elemento como um botão do projeto.
   *
   * className:
   * Combina as classes geradas pelo cva com qualquer classe
   * adicional enviada pelo usuário.
   *
   * ...props:
   * Repassa as propriedades restantes para o botão,
   * como onClick, disabled, children, type e outras.
   */
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({
          variant,
          size,
          className,
        }),
      )}
      {...props}
    />
  )
}


/* ============================================================
   4. EXPORTAÇÕES
   ============================================================ */

/*
 * Exporta:
 *
 * Button:
 * Componente utilizado para renderizar botões.
 *
 * buttonVariants:
 * Função que pode ser reutilizada para obter as classes
 * de uma determinada variante e tamanho.
 */
export {
  Button,
  buttonVariants,
}

