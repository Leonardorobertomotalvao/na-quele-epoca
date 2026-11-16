// ============================================================
// NA MINHA ÉPOCA — app/api/comunidade/comments/[id]/route.ts
// ============================================================
// EXCLUSÃO DE COMENTÁRIO.
//
// DELETE /api/comunidade/comments/<id>
//
// Quem pode excluir (verificado AQUI no servidor, nunca só na
// interface):
// - o autor do comentário (exclui o seu);
// - o autor da publicação (exclui comentários do seu post);
// - administradores (excluem qualquer um; ação registrada no
//   histórico da moderação).
//
// A confirmação acontece na interface; o servidor executa a
// exclusão real e devolve ok para a interface se atualizar
// imediatamente.
// ============================================================
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Role = "USER" | "ADMIN";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          error: "Você precisa estar logado para excluir um comentário.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        {
          error: "Comentário não informado.",
        },
        {
          status: 400,
        }
      );
    }

    const comentario = await prisma.comment.findUnique({
      where: {
        id,
      },

      include: {
        post: {
          select: {
            id: true,
            authorId: true,
          },
        },
      },
    });

    if (!comentario) {
      return NextResponse.json(
        {
          error: "Comentário não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * Papel real no banco (não confiar em claims da sessão).
     */
    const usuario = await prisma.user.findUnique({
      where: {
        id: session.user.id,
      },

      select: {
        id: true,
        role: true,
      },
    });

    const souAdmin = usuario?.role === "ADMIN";

    const souAutorDoComentario = comentario.authorId === session.user.id;
    const souAutorDoPost =
      comentario.post.authorId === session.user.id;

    if (!souAdmin && !souAutorDoComentario && !souAutorDoPost) {
      return NextResponse.json(
        {
          error: "Você não pode excluir este comentário.",
        },
        {
          status: 403,
        }
      );
    }

    await prisma.comment.delete({
      where: {
        id: comentario.id,
      },
    });

    /**
     * Exclusões feitas por ADMINS entram no histórico da
     * moderação (exclusões do próprio autor são privadas).
     */
    if (souAdmin) {
      await prisma.moderationAction.create({
        data: {
          acao: "EXCLUIDO",
          tipo: "COMMENT",
          contentId: comentario.id,
          adminId: session.user.id,
          conteudoResumo: comentario.content.slice(0, 200),
        },
      });

      /**
       * Se havia sinalizações pendentes deste comentário,
       * fechamos todas com resultado EXCLUIDO (a central não
       * deve exibir pendência sobre conteúdo que não existe).
       */
      await prisma.contentFlag.updateMany({
        where: {
          tipo: "COMMENT",
          contentId: comentario.id,
          status: "PENDENTE",
        },

        data: {
          status: "RESOLVIDA",
          resultado: "EXCLUIDO",
          reviewedById: session.user.id,
          reviewedAt: new Date(),
        },
      });
    }

    return NextResponse.json(
      {
        ok: true,
        mensagem: "Comentário removido.",
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Erro ao excluir comentário:", error);

    return NextResponse.json(
      {
        error: "Não foi possível excluir o comentário.",
      },
      {
        status: 500,
      }
    );
  }
}
