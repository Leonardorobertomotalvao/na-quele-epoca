import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  detalhesDaModeracao,
  pareceEnvioRepetido,
  verificarTexto,
} from "@/lib/moderacao-texto";
import { imagemValida } from "@/lib/validar-brincadeira";

/**
 * ============================================================
 * GET
 * CARREGA OS POSTS + COMENTÁRIOS + CURTIDAS
 * ============================================================
 */

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    /**
     * Posts ocultos pela moderação automática aparecem APENAS
     * para o próprio autor (com aviso "em revisão"). Para os
     * demais usuários, o post simplesmente não existe no feed.
     */
    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
      },

      where: session?.user
        ? {
            OR: [{ oculto: false }, { authorId: session.user.id }],
          }
        : { oculto: false },

      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },

        _count: {
          select: {
            /**
             * Comentários ocultos não entram na contagem exibida.
             */
            comments: {
              where: { oculto: false },
            },
            likes: true,
          },
        },

        /**
         * Busca somente a curtida do usuário atual.
         * Assim conseguimos saber se ele já curtiu o post.
         */
        likes: {
          where: {
            userId:
              session?.user?.id ??
              "__usuario_nao_logado__",
          },

          select: {
            id: true,
          },
        },
      },
    });

    /**
     * Remove a lista interna de likes
     * e devolve somente likedByMe.
     */
    const formattedPosts = posts.map((post) => ({
      id: post.id,
      content: post.content,
      imageUrl: post.imageUrl,
      createdAt: post.createdAt,
      updatedAt: post.updatedAt,

      // Informações de moderação (avisos do autor "em revisão").
      oculto: post.oculto,
      ocultoMotivo: post.ocultoMotivo,

      author: post.author,

      _count: post._count,

      likedByMe: post.likes.length > 0,
    }));

    return NextResponse.json(formattedPosts);
  } catch (error) {
    console.error("Erro ao buscar posts:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível carregar as publicações.",
      },
      {
        status: 500,
      }
    );
  }
}

/**
 * ============================================================
 * POST
 * CRIA UMA NOVA PUBLICAÇÃO
 * ============================================================
 */

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          error:
            "Você precisa estar logado para publicar.",
        },
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    const imageUrl =
      typeof body.imageUrl === "string" &&
      body.imageUrl.trim()
        ? body.imageUrl.trim()
        : null;

    /**
     * Conteúdo vazio
     */
    if (!content && !imageUrl) {
      return NextResponse.json(
        {
          error:
            "Escreva alguma coisa ou adicione uma imagem antes de publicar.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Limite de caracteres
     */
    if (content.length > 2000) {
      return NextResponse.json(
        {
          error:
            "A publicação pode ter no máximo 2000 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * A imagem precisa ter vindo do upload oficial do site.
     */
    if (imageUrl && !imagemValida(imageUrl)) {
      return NextResponse.json(
        {
          error:
            "A imagem precisa ser enviada pelo site (fale com o suporte se este aviso aparecer).",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Moderação automática: texto claramente impróprio é
     * bloqueado; texto suspeito nasce oculto, aguardando
     * análise humana (nunca excluído e nunca publicado).
     */
    const analise = verificarTexto(content);

    if (analise.nivel === "BLOQUEADO") {
      return NextResponse.json(
        {
          error:
            analise.mensagem ??
            "Revise as palavras e publique de forma gentil, por favor.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Anti-spam: não repetir a MESMA publicação logo depois.
     */
    const ultimasProprias = await prisma.post.findMany({
      where: {
        authorId: session.user.id,
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 2,

      select: {
        content: true,
      },
    });

    if (
      pareceEnvioRepetido(
        content,
        ultimasProprias.map((p) => p.content)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Essa publicação é igual à última que você enviou. Revise antes de publicar de novo.",
        },
        {
          status: 400,
        }
      );
    }

    const oculto = analise.nivel === "SUSPEITO";

    /**
     * Cria o post.
     */
    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        authorId: session.user.id,

        oculto,
        ocultoMotivo: oculto ? "classificacao automatica" : null,
        ocultoEm: oculto ? new Date() : null,
      },

      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },

        _count: {
          select: {
            comments: {
              where: { oculto: false },
            },
            likes: true,
          },
        },
      },
    });

    /**
     * Registro automático na central de moderação.
     */
    if (oculto) {
      const jaTemFlagAutomatica = await prisma.contentFlag.findFirst({
        where: {
          tipo: "POST",
          contentId: post.id,
          origem: "AUTOMATICA",
          status: "PENDENTE",
        },

        select: { id: true },
      });

      if (!jaTemFlagAutomatica) {
        await prisma.contentFlag.create({
          data: {
            tipo: "POST",
            contentId: post.id,
            origem: "AUTOMATICA",
            classificacao: analise.categorias.join(", ") || "SUSPEITO",
            detalhes: detalhesDaModeracao(analise),
          },
        });
      }
    }

    /**
     * Um post recém-criado ainda não foi curtido.
     */
    const formattedPost = {
      ...post,
      likedByMe: false,
    };

    return NextResponse.json(formattedPost, {
      status: 201,
    });
  } catch (error) {
    console.error("Erro ao criar post:", error);

    return NextResponse.json(
      {
        error:
          "Não foi possível criar a publicação.",
      },
      {
        status: 500,
      }
    );
  }
}