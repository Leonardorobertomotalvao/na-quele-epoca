import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const posts = await prisma.post.findMany({
      orderBy: {
        createdAt: "desc",
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
            comments: true,
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
     * Cria o post.
     */
    const post = await prisma.post.create({
      data: {
        content,
        imageUrl,
        authorId: session.user.id,
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
            comments: true,
            likes: true,
          },
        },
      },
    });

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