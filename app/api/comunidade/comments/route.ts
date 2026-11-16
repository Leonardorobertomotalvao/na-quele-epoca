import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  detalhesDaModeracao,
  pareceEnvioRepetido,
  verificarTexto,
} from "@/lib/moderacao-texto";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const postId = searchParams.get("postId");

    if (!postId) {
      return NextResponse.json(
        {
          error: "Post não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const session = await auth.api.getSession({
      headers: request.headers,
    });

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { authorId: true, oculto: true } });
    if (!post || (post.oculto && post.authorId !== session?.user?.id)) {
      return NextResponse.json({ error: "Publicação não encontrada." }, { status: 404 });
    }

    /**
     * Comentários ocultos pela moderação automática ficam
     * visíveis APENAS para o autor (aviso de revisão). Todos
     * os demais comentários ocultos não aparecem no feed.
     */
    const comments = await prisma.comment.findMany({
      where: {
        postId,

        OR: session?.user
          ? [{ oculto: false }, { authorId: session.user.id }]
          : [{ oculto: false }],
      },

      orderBy: {
        createdAt: "asc",
      },

      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
      },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error(
      "Erro ao buscar comentários:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível carregar os comentários.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          error:
            "Você precisa estar logado para comentar.",
        },
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    const postId =
      typeof body.postId === "string"
        ? body.postId
        : "";

    const content =
      typeof body.content === "string"
        ? body.content.trim()
        : "";

    if (!postId) {
      return NextResponse.json(
        {
          error: "Post inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!content) {
      return NextResponse.json(
        {
          error: "Escreva um comentário.",
        },
        {
          status: 400,
        }
      );
    }

    if (content.length > 500) {
      return NextResponse.json(
        {
          error:
            "O comentário pode ter no máximo 500 caracteres.",
        },
        {
          status: 400,
        }
      );
    }

    const post = await prisma.post.findUnique({
      where: {
        id: postId,
      },

      select: {
        id: true,
        authorId: true,
        oculto: true,
      },
    });

    if (!post) {
      return NextResponse.json(
        {
          error: "Publicação não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * Publicação oculta pela moderação não recebe comentários
     * de terceiros (só o autor vê o post e pode comentar nele).
     */
    if (post.oculto && post.authorId !== session.user.id) {
      return NextResponse.json(
        {
          error: "Publicação não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * Moderação automática: textos claramente impróprios são
     * barrados; textos suspeitos entram ocultos, aguardando a
     * análise de um administrador (nunca exclusão automática).
     */
    const analise = verificarTexto(content);

    if (analise.nivel === "BLOQUEADO") {
      return NextResponse.json(
        {
          error: analise.mensagem ?? "Escreva com gentileza, por favor.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Anti-spam: não repetir o MESMO texto logo após o anterior.
     */
    const ultimosProprios = await prisma.comment.findMany({
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
        ultimosProprios.map((c) => c.content)
      )
    ) {
      return NextResponse.json(
        {
          error:
            "Você já escreveu exatamente este comentário há pouco. Que tal comentar algo novo?",
        },
        {
          status: 400,
        }
      );
    }

    const oculto = analise.nivel === "SUSPEITO";

    const comment = await prisma.comment.create({
      data: {
        content,

        postId,

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
      },
    });

    /**
     * Registro automático na central de moderação.
     */
    if (oculto) {
      const jaTemFlagAutomatica = await prisma.contentFlag.findFirst({
        where: {
          tipo: "COMMENT",
          contentId: comment.id,
          origem: "AUTOMATICA",
          status: "PENDENTE",
        },

        select: { id: true },
      });

      if (!jaTemFlagAutomatica) {
        await prisma.contentFlag.create({
          data: {
            tipo: "COMMENT",
            contentId: comment.id,
            origem: "AUTOMATICA",
            classificacao: analise.categorias.join(", ") || "SUSPEITO",
            detalhes: detalhesDaModeracao(analise),
          },
        });
      }
    }

    return NextResponse.json(comment, {
      status: 201,
    });
  } catch (error) {
    console.error(
      "Erro ao criar comentário:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Não foi possível criar o comentário.",
      },
      {
        status: 500,
      }
    );
  }
}
