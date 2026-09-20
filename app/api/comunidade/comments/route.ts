import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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

    const comments = await prisma.comment.findMany({
      where: {
        postId,
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

    const comment = await prisma.comment.create({
      data: {
        content,
        postId,
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
      },
    });

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