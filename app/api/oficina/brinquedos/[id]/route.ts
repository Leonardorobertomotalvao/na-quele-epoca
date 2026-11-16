// ============================================================
// NA MINHA ÉPOCA — app/api/oficina/brinquedos/[id]/route.ts
// ============================================================
// EDIÇÃO E EXCLUSÃO DO PRÓPRIO ENVIO pela comunidade.
//
// PUT    /api/oficina/brinquedos/<id>
//        → o autor edita o brinquedo enquanto ele está PENDENTE,
//          CORRECAO_SOLICITADA ou REJEITADO. Toda edição volta
//          para PENDENTE (volta pra fila de revisão; limpa o
//          motivo de rejeição/correção). Envio APROVADO não é
//          editável pelo autor (fale com a moderação).
//
// DELETE /api/oficina/brinquedos/<id>
//        → o autor exclui o próprio envio; administradores
//          podem excluir qualquer um. Exclusão de envio
//          APROVADO também é permitida (o criador pode remover
//          a própria obra da Oficina).
//
// As permissões são verificadas AQUI no servidor.
// ============================================================
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validarBrinquedo } from "@/lib/validar-brinquedo";

const STATUS_EDITAVEIS = [
  "PENDENTE",
  "CORRECAO_SOLICITADA",
  "REJEITADO",
] as const;

const PROJECAO = {
  id: true,
  name: true,
  image: true,
  description: true,
  materials: true,
  tools: true,
  steps: true,
  timeLabel: true,
  difficulty: true,
  minAge: true,
  players: true,
  benefits: true,
  alternatives: true,
  safety: true,
  supervision: true,
  status: true,
  rejectionReason: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: {
      id: true,
      name: true,
      image: true,
    },
  },
};

async function buscarComPapel(id: string, usuarioId: string) {
  const brinquedo = await prisma.workshopToy.findUnique({
    where: { id },

    select: {
      id: true,
      authorId: true,
      status: true,
    },
  });

  if (!brinquedo) {
    return { brinquedo: null };
  }

  const usuario = await prisma.user.findUnique({
    where: {
      id: usuarioId,
    },

    select: {
      id: true,
      role: true,
    },
  });

  return {
    brinquedo,
    souAutor: brinquedo.authorId === usuarioId,
    souAdmin: usuario?.role === "ADMIN",
  };
}

export async function PUT(
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
          error: "Você precisa estar logado para editar seu envio.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    const achado = await buscarComPapel(id, session.user.id);

    if (!achado.brinquedo) {
      return NextResponse.json(
        {
          error: "Brinquedo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /**
     * Somente o AUTOR edita o próprio envio (admin edita pela
     * central de moderação, com registro próprio).
     */
    if (!achado.souAutor) {
      return NextResponse.json(
        {
          error: "Você só pode editar os seus próprios envios.",
        },
        {
          status: 403,
        }
      );
    }

    if (
      !STATUS_EDITAVEIS.includes(achado.brinquedo.status as never)
    ) {
      return NextResponse.json(
        {
          error:
            "Este brinquedo já foi aprovado. Fale com a moderação para corrigir alguma coisa.",
        },
        {
          status: 403,
        }
      );
    }

    const body = await request.json();

    const resultado = validarBrinquedo(body);

    if (!resultado.ok) {
      return NextResponse.json(
        {
          error: resultado.erro,
        },
        {
          status: 400,
        }
      );
    }

    const brinquedo = await prisma.workshopToy.update({
      where: {
        id,
      },

      data: {
        ...resultado.dados,

        /**
         * Toda edição volta para a fila de revisão.
         */
        status: "PENDENTE",
        rejectionReason: null,
      },

      select: PROJECAO,
    });

    return NextResponse.json({
      ok: true,
      brinquedo,
      mensagem:
        "Brinquedo atualizado! Ele voltou para a fila de revisão.",
    });
  } catch (error) {
    console.error("Erro ao editar brinquedo:", error);

    return NextResponse.json(
      {
        error: "Não foi possível atualizar o brinquedo.",
      },
      {
        status: 500,
      }
    );
  }
}

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
          error: "Você precisa estar logado para excluir um envio.",
        },
        {
          status: 401,
        }
      );
    }

    const { id } = await params;

    const achado = await buscarComPapel(id, session.user.id);

    if (!achado.brinquedo) {
      return NextResponse.json(
        {
          error: "Brinquedo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    if (!achado.souAutor && !achado.souAdmin) {
      return NextResponse.json(
        {
          error: "Você não pode excluir este envio.",
        },
        {
          status: 403,
        }
      );
    }

    await prisma.workshopToy.delete({
      where: {
        id,
      },
    });

    return NextResponse.json({
      ok: true,
      mensagem: "Envio removido da Oficina.",
    });
  } catch (error) {
    console.error("Erro ao excluir brinquedo:", error);

    return NextResponse.json(
      {
        error: "Não foi possível excluir o envio.",
      },
      {
        status: 500,
      }
    );
  }
}
