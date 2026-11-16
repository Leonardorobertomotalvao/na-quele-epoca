// ============================================================
// NA MINHA ÉPOCA — app/api/comunidade/denuncias/route.ts
// ============================================================
// RECEPCIONA DENÚNCIAS da comunidade.
//
// POST   /api/comunidade/denuncias
//        body: { tipo: 'POST' | 'COMMENT', contentId, motivo }
//
// Regras:
// - só usuários autenticados denunciam;
// - 7 motivos fixos (mesma lista da interface);
// - uma denúncia NÃO oculta nem exclui o conteúdo — ela apenas
//   entra na central de moderação do administrador;
// - o MESMO usuário não denuncia o MESMO conteúdo duas vezes;
// - limite de abuso: no máximo 8 denúncias por hora.
// ============================================================
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/**
 * Mesma ordem/labels da interface (7 motivos).
 */
const MAPA_MOTIVOS: Record<
  string,
  | "XINGAMENTO"
  | "ASSEDIO"
  | "AMEACA"
  | "ODIO"
  | "SPAM"
  | "INADEQUADO"
  | "OUTRO"
> = {
  "Xingamento ou ofensa": "XINGAMENTO",
  "Assédio ou bullying": "ASSEDIO",
  Ameaça: "AMEACA",
  "Discurso de ódio": "ODIO",
  Spam: "SPAM",
  "Conteúdo inadequado": "INADEQUADO",
  Outro: "OUTRO",
};

const LIMITE_DENUNCIAS_POR_HORA = 8;

export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          error: "Você precisa estar logado para denunciar.",
        },
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    const tipo =
      body.tipo === "POST" || body.tipo === "COMMENT"
        ? body.tipo
        : null;

    const contentId =
      typeof body.contentId === "string" ? body.contentId : "";

    const motivoLabel =
      typeof body.motivo === "string" ? body.motivo : "";

    const motivo = MAPA_MOTIVOS[motivoLabel];

    if (!tipo) {
      return NextResponse.json(
        {
          error: "Tipo de conteúdo inválido.",
        },
        {
          status: 400,
        }
      );
    }

    if (!contentId) {
      return NextResponse.json(
        {
          error: "Conteúdo não informado.",
        },
        {
          status: 400,
        }
      );
    }

    if (!motivo) {
      return NextResponse.json(
        {
          error: "Escolha um motivo da lista.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Proteção contra abuso: limite por hora por usuário.
     */
    const quantidadeUltimaHora = await prisma.contentFlag.count({
      where: {
        reporterId: session.user.id,
        createdAt: {
          gte: new Date(Date.now() - 60 * 60 * 1000),
        },
      },
    });

    if (quantidadeUltimaHora >= LIMITE_DENUNCIAS_POR_HORA) {
      return NextResponse.json(
        {
          error:
            "Você enviou várias denúncias hoje. Volte mais tarde, por favor.",
        },
        {
          status: 429,
        }
      );
    }

    /**
     * O conteúdo denunciado precisa existir de verdade.
     */
    const existe =
      tipo === "POST"
        ? await prisma.post.findUnique({
            where: { id: contentId },
            select: { id: true },
          })
        : await prisma.comment.findUnique({
            where: { id: contentId },
            select: { id: true },
          });

    if (!existe) {
      return NextResponse.json(
        {
          error: "Conteúdo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * Antiduplicata: mesmo usuário + mesmo conteúdo.
     */
    const duplicada = await prisma.contentFlag.findFirst({
      where: {
        tipo,
        contentId,
        origem: "DENUNCIA",
        reporterId: session.user.id,
      },
      select: { id: true },
    });

    if (duplicada) {
      return NextResponse.json(
        {
          duplicada: true,
          mensagem:
            "Você já denunciou este conteúdo antes. Nossa equipe vai analisar.",
        },
        {
          status: 200,
        }
      );
    }

    await prisma.contentFlag.create({
      data: {
        tipo,
        contentId,
        origem: "DENUNCIA",
        motivo: motivo,
        reporterId: session.user.id,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        mensagem:
          "Denúncia registrada. Um administrador vai analisar o conteúdo.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Erro ao registrar denúncia:", error);

    return NextResponse.json(
      {
        error: "Não foi possível registrar a denúncia.",
      },
      {
        status: 500,
      }
    );
  }
}
