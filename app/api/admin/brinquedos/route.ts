// ============================================================
// NA MINHA ÉPOCA — app/api/admin/brinquedos/route.ts
// ============================================================
// CENTRAL DE MODERAÇÃO DOS BRINQUEDOS DA OFICINA (painel /admin).
//
// GET   /api/admin/brinquedos
//         → todos os envios (com autor), ordenados pelos
//           aguardando revisão primeiro.
//
// PATCH /api/admin/brinquedos
//       body: { id, acao, campos?, motivo? }
//         acao = SALVAR    → salva edição dos campos (status
//                            permanece);
//               APROVAR    → publica na Oficina (APROVADO);
//               REJEITAR   → REJEITADO com motivo obrigatório;
//               CORRIGIR   → pede ajuste (CORRECAO_SOLICITADA)
//                            com nota obrigatória.
//
// Regras:
// - somente ADMIN;
// - toda validação de campos roda por validarBrinquedo;
// - a rastreabilidade das ações fica nos campos do próprio
//   brinquedo (status, rejectionReason, reviewedAt) — a tabela
//   ModerationAction é específica de posts/comentários.
// ============================================================
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validarBrinquedo } from "@/lib/validar-brinquedo";

type Role = "USER" | "ADMIN";

const PRIORIDADE_STATUS: Record<string, number> = {
  PENDENTE: 0,
  CORRECAO_SOLICITADA: 1,
  REJEITADO: 2,
  APROVADO: 3,
};

/**
 * Verifica a sessão e o papel do usuário.
 * Mesmo padrão de app/api/admin/brincadeiras.
 */
async function exigirAdmin(request: Request) {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session?.user) {
    return {
      erro: NextResponse.json(
        { error: "Entre com sua conta para acessar a moderação." },
        { status: 401 }
      ),
    };
  }

  const usuario = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },

    select: {
      id: true,
      role: true,
    },
  });

  if (!usuario || (usuario.role as Role) !== "ADMIN") {
    return {
      erro: NextResponse.json(
        { error: "Somente administradores podem avaliar os envios." },
        { status: 403 }
      ),
    };
  }

  return { usuario };
}

export async function GET(request: Request) {
  try {
    const guard = await exigirAdmin(request);
    if (guard.erro) {
      return guard.erro;
    }

    const brinquedos = await prisma.workshopToy.findMany({
      orderBy: {
        createdAt: "desc",
      },

      take: 300,

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
     * Ordem amigável para o painel: o que precisa de revisão
     * primeiro.
     */
    brinquedos.sort(
      (a, b) =>
        (PRIORIDADE_STATUS[a.status] ?? 9) -
        (PRIORIDADE_STATUS[b.status] ?? 9)
    );

    return NextResponse.json(brinquedos);
  } catch (error) {
    console.error("Erro ao listar brinquedos da oficina:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar os envios da oficina.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function PATCH(request: Request) {
  try {
    const guard = await exigirAdmin(request);
    if (guard.erro) {
      return guard.erro;
    }

    const adminId = guard.usuario.id;

    const body = await request.json();

    const id = typeof body.id === "string" ? body.id : "";

    const acaoValida =
      body.acao === "SALVAR" ||
      body.acao === "APROVAR" ||
      body.acao === "REJEITAR" ||
      body.acao === "CORRIGIR";

    if (!id || !acaoValida) {
      return NextResponse.json(
        {
          error: "Envio ou ação inválida.",
        },
        {
          status: 400,
        }
      );
    }

    const brinquedo = await prisma.workshopToy.findUnique({
      where: {
        id,
      },

      select: {
        id: true,
        status: true,
        name: true,
      },
    });

    if (!brinquedo) {
      return NextResponse.json(
        {
          error: "Brinquedo não encontrado.",
        },
        {
          status: 404,
        }
      );
    }

    /*** ================================================= ***/
    /*** SALVAR — edição dos campos pelo administrador.    ***/
    /*** ================================================= ***/
    if (body.acao === "SALVAR") {
      const resultado = validarBrinquedo(
        body.campos ?? {}
      );

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

      const atualizado = await prisma.workshopToy.update({
        where: {
          id,
        },

        data: resultado.dados,

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

      return NextResponse.json({
        ok: true,
        brinquedo: atualizado,
        mensagem: "Alterações salvas.",
      });
    }

    /*** ================================================= ***/
    /*** APROVAR — pode já aceitar edições antes da aprovação. ***/
    /*** ================================================= ***/
    if (body.acao === "APROVAR") {
      // Se o administrador ajustou campos na tela, aplica primeiro.
      if (body.campos && typeof body.campos === "object") {
        const resultado = validarBrinquedo(body.campos);

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

        await prisma.workshopToy.update({
          where: {
            id,
          },

          data: resultado.dados,
        });
      }

      const aprovado = await prisma.workshopToy.update({
        where: {
          id,
        },

        data: {
          status: "APROVADO",
          rejectionReason: null,
          reviewedAt: new Date(),
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

      return NextResponse.json({
        ok: true,
        brinquedo: aprovado,
        mensagem: "Brinquedo publicado na Oficina.",
      });
    }

    /*** ================================================= ***/
    /*** REJEITAR — exige motivo que o autor verá.         ***/
    /*** ================================================= ***/
    if (body.acao === "REJEITAR") {
      const motivo =
        typeof body.motivo === "string" ? body.motivo.trim() : "";

      if (motivo.length < 10 || motivo.length > 300) {
        return NextResponse.json(
          {
            error:
              "Escreva o motivo da rejeição (entre 10 e 300 caracteres).",
          },
          {
            status: 400,
          }
        );
      }

      const rejeitado = await prisma.workshopToy.update({
        where: {
          id,
        },

        data: {
          status: "REJEITADO",
          rejectionReason: motivo,
          reviewedAt: new Date(),
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

      return NextResponse.json({
        ok: true,
        brinquedo: rejeitado,
        mensagem: "Envio rejeitado. O autor verá o motivo.",
      });
    }

    /*** ================================================= ***/
    /*** CORRIGIR — pede ajustes; o autor reenvia depois.  ***/
    /*** ================================================= ***/
    const nota =
      typeof body.motivo === "string" ? body.motivo.trim() : "";

    if (nota.length < 10 || nota.length > 300) {
      return NextResponse.json(
        {
          error:
            "Escreva o pedido de correção (entre 10 e 300 caracteres).",
        },
        {
          status: 400,
        }
      );
    }

    const corrigir = await prisma.workshopToy.update({
      where: {
        id,
      },

      data: {
        status: "CORRECAO_SOLICITADA",
        rejectionReason: nota,
        reviewedAt: new Date(),
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

    return NextResponse.json({
      ok: true,
      brinquedo: corrigir,
      mensagem:
        "Pedido de correção enviado. O autor poderá ajustar e reenviar.",
    });
  } catch (error) {
    console.error("Erro na moderação de brinquedos:", error);

    return NextResponse.json(
      {
        error: "Não foi possível concluir a ação.",
      },
      {
        status: 500,
      }
    );
  }
}
