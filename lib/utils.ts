// ============================================================
// utils.ts
// ============================================================
// Este arquivo reúne funções utilitárias que podem ser usadas
// em diferentes partes do projeto.
//
// Aqui temos a função `cn`, usada principalmente para combinar
// classes CSS do Tailwind de forma organizada e segura.
// ============================================================


// ------------------------------------------------------------
// 1. Importação do clsx
// ------------------------------------------------------------
// `clsx` permite juntar nomes de classes CSS de maneira
// condicional.
//
// Exemplo:
// clsx('text-red-500', ativo && 'font-bold')
//
// Se `ativo` for true, as duas classes serão incluídas.
// Se `ativo` for false, somente `text-red-500` será incluída.
//
// `ClassValue` é um tipo do TypeScript que representa os
// valores aceitos pelo clsx: strings, objetos, arrays,
// valores booleanos, null, undefined etc.
import { clsx, type ClassValue } from 'clsx'


// ------------------------------------------------------------
// 2. Importação do twMerge
// ------------------------------------------------------------
// `twMerge` pertence à biblioteca `tailwind-merge`.
//
// Ele identifica classes do Tailwind que entram em conflito
// e mantém a classe mais apropriada.
//
// Exemplo:
// twMerge('px-2', 'px-4')
//
// Resultado:
// 'px-4'
//
// Isso evita que várias classes conflitantes deixem o estilo
// do componente difícil de controlar.
import { twMerge } from 'tailwind-merge'


// ------------------------------------------------------------
// 3. Função cn
// ------------------------------------------------------------
// `cn` significa, normalmente, "class names".
//
// A função recebe várias classes CSS como argumentos e
// retorna uma única string com as classes organizadas.
//
// O operador `...inputs` é chamado de spread/rest parameter.
// Ele permite passar quantas classes forem necessárias.
//
// Exemplo de uso:
// cn('text-sm', 'font-bold', ativo && 'text-green-500')
//
// A função executa duas etapas:
//
// 1. `clsx(inputs)`
//    Junta os valores recebidos e remove valores inválidos
//    ou condicionais que resultem em false.
//
// 2. `twMerge(...)`
//    Analisa as classes do Tailwind e resolve conflitos.
//
// Assim, a função combina a flexibilidade do clsx com a
// organização do tailwind-merge.
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}