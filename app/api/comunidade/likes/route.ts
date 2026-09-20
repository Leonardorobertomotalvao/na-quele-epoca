import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          error: "Você precisa estar logado para curtir.",
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

    const existingLike = await prisma.like.findUnique({
      where: {
        userId_postId: {
          userId: session.user.id,
          postId,
        },
      },
    });

    if (existingLike) {
      await prisma.like.delete({
        where: {
          id: existingLike.id,
        },
      });

      const likesCount = await prisma.like.count({
        where: {
          postId,
        },
      });

      return NextResponse.json({
        liked: false,
        likesCount,
      });
    }

    await prisma.like.create({
      data: {
        userId: session.user.id,
        postId,
      },
    });

    const likesCount = await prisma.like.count({
      where: {
        postId,
      },
    });

    return NextResponse.json({
      liked: true,
      likesCount,
    });
  } catch (error) {
    console.error("Erro ao curtir publicação:", error);

    return NextResponse.json(
      {
        error: "Não foi possível atualizar a curtida.",
      },
      {
        status: 500,
      }
    );
  }
}