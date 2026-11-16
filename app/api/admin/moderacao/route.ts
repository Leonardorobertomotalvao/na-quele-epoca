// ============================================================
// NA MINHA ÉPOCA — app/api/admin/moderacao/route.ts
// ============================================================
// CENTRAL DE MODERAÇÃO DO PAINEL /admin.
//
// GET    /api/admin/moderacao
//          ?situacao=pendentes|historico  (padrão: pendentes)
//          &tipo=todos|POST|COMMENT
//          &motivo=todos|XINGAMENTO|ASSEDIO|AMEACA|ODIO|SPAM|
//                  INADEQUADO|OUTRO|AUTO
//
//        pendentes  → sinalizações aguardando análise (denúncias
//                     de usuários + marcações automáticas), com o
//                     conteúdo atual incluído pra leitura.
//        historico  → ações de moderação já realizadas +
//                     resoluções de sinalizações.
//
// PATCH  /api/admin/moderacao
//        body: { flagId, acao: 'MANTIDO'|'RESTAURADO'|'EXCLUIDO',
//                nota? }
//
// Regras:
// - somente ADMIN (sem permissão → 403);
// - EXCLUIDO remove o conteúdo DE VERDADE (decisão humana) e
//   fecha as sinalizações pendentes dele;
// - MANTIDO/RESTAURADO mantêm o conteúdo publicado: para conteúdo
//   oculto pela moderação automática, volta a aparecer;
// - TODA ação é registrada em ModerationAction (histórico).
// ============================================================
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type Role = "USER" | "ADMIN";

const MOTIVOS_VALIDOS = [
  "XINGAMENTO",
  "ASSEDIO",
  "AMEACA",
  "ODIO",
  "SPAM",
  "INADEQUADO",
  "OUTRO",
] as const;

const MOTIVOS_LABEL: Record<string, string> = {
  XINGAMENTO: "Xingamento ou ofensa",
  ASSEDIO: "Assédio ou bullying",
  AMEACA: "Ameaça",
  ODIO: "Discurso de ódio",
  SPAM: "Spam",
  INADEQUADO: "Conteúdo inadequado",
  OUTRO: "Outro",
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
        { error: "Somente administradores podem acessar a moderação." },
        { status: 403 }
      ),
    };
  }

  return { usuario };
}

/* ============================================================
   GET
   ============================================================ */

export async function GET(request: Request) {
  try {
    const guard = await exigirAdmin(request);
    if (guard.erro) {
      return guard.erro;
    }

    const { searchParams } = new URL(request.url);

    const situacao = searchParams.get("situacao") === "historico"
      ? "historico"
      : "pendentes";

    const tipoParam = searchParams.get("tipo");
    const tipoFiltro =
      tipoParam === "POST" || tipoParam === "COMMENT" ? tipoParam : null;

    const motivoParam = searchParams.get("motivo") || "todos";

    const motivoFiltro = (MOTIVOS_VALIDOS as readonly string[]).includes(
      motivoParam
    )
      ? (motivoParam as (typeof MOTIVOS_VALIDOS)[number])
      : null;

    const filtroMotivoOuOrigem = motivoFiltro
      ? { motivo: motivoFiltro }
      : motivoParam === "AUTO"
        ? { origem: "AUTOMATICA" as const }
        : null;

    if (situacao === "historico") {
      /**
       * HISTÓRICO: resoluções de sinalizações + ações registradas.
       */
      const flagsResolvidas = await prisma.contentFlag.findMany({
        where: {
          status: "RESOLVIDA",
          ...(tipoFiltro ? { tipo: tipoFiltro } : {}),
          ...(filtroMotivoOuOrigem ? filtroMotivoOuOrigem : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 120,

        include: {
          reporter: {
            select: { id: true, name: true, image: true },
          },
          reviewedBy: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      const acoes = await prisma.moderationAction.findMany({
        where: {
          ...(tipoFiltro ? { tipo: tipoFiltro } : {}),
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 120,

        include: {
          admin: {
            select: { id: true, name: true, image: true },
          },
        },
      });

      return NextResponse.json({
        situacao,
        flags: flagsResolvidas,
        acoes,
      });
    }

    /**
     * PENDENTES: sinalizações abertas + estado atual do conteúdo.
     */
    const flagsPendentes = await prisma.contentFlag.findMany({
      where: {
        status: "PENDENTE",

        ...(tipoFiltro ? { tipo: tipoFiltro } : {}),
        ...(filtroMotivoOuOrigem ? filtroMotivoOuOrigem : {}),
      },

      orderBy: {
        createdAt: "desc",
      },

      take: 200,

      include: {
        reporter: {
          select: { id: true, name: true, image: true },
        },
      },
    });

    const idsDePost = Array.from(
      new Set(
        flagsPendentes
          .filter((f) => f.tipo === "POST")
          .map((f) => f.contentId)
      )
    );

    const idsDeComment = Array.from(
      new Set(
        flagsPendentes
          .filter((f) => f.tipo === "COMMENT")
          .map((f) => f.contentId)
      )
    );

    const [postsEncontrados, commentsEncontrados] = await Promise.all([
      idsDePost.length
        ? prisma.post.findMany({
            where: { id: { in: idsDePost } },

            include: {
              author: {
                select: { id: true, name: true, image: true },
              },
            },
          })
        : Promise.resolve([]),

      idsDeComment.length
        ? prisma.comment.findMany({
            where: { id: { in: idsDeComment } },

            include: {
              author: {
                select: { id: true, name: true, image: true },
              },

              post: {
                select: {
                  id: true,
                  content: true,
                  author: {
                    select: { id: true, name: true },
                  },
                },
              },
            },
          })
        : Promise.resolve([]),
    ]);

    const mapaPosts = new Map(postsEncontrados.map((p) => [p.id, p]));
    const mapaComments = new Map(commentsEncontrados.map((c) => [c.id, c]));

    /**
     * Quantidade de denúncias de cada conteúdo (todas as
     * origens DENUNCIA, resolvidas ou não) para mostrar o
     * peso para o moderador.
     */
    const denunciasPor = new Map<string, number>();

    if (idsDePost.length || idsDeComment.length) {
      const todasDenuncias = await prisma.contentFlag.findMany({
        where: {
          origem: "DENUNCIA",
          OR: [
            ...(idsDePost.length
              ? [{ tipo: "POST" as const, contentId: { in: idsDePost } }]
              : []),
            ...(idsDeComment.length
              ? [
                  {
                    tipo: "COMMENT" as const,
                    contentId: { in: idsDeComment },
                  },
                ]
              : []),
          ],
        },

        select: {
          tipo: true,
          contentId: true,
        },
      });

      for (const d of todasDenuncias) {
        const chave = `${d.tipo}:${d.contentId}`;
        denunciasPor.set(chave, (denunciasPor.get(chave) || 0) + 1);
      }
    }

    const items = flagsPendentes.map((flag) => {
      const chave = `${flag.tipo}:${flag.contentId}`;

      if (flag.tipo === "POST") {
        const post = mapaPosts.get(flag.contentId);

        return {
          flagId: flag.id,
          tipo: flag.tipo,
          contentId: flag.contentId,
          origem: flag.origem,
          motivo: flag.motivo ? MOTIVOS_LABEL[flag.motivo] : null,
          classificacao: flag.classificacao,
          detalhes: flag.detalhes,
          createdAt: flag.createdAt,
          reporter: flag.reporter,
          denuncias: denunciasPor.get(chave) ?? 0,

          conteudo: post
            ? {
                existe: true,
                content: post.content,
                imageUrl: post.imageUrl,
                createdAt: post.createdAt,
                oculto: post.oculto,
                ocultoMotivo: post.ocultoMotivo,
                author: post.author,
                post: null,
              }
            : {
                existe: false,
                content: null,
              },
        };
      }

      const comment = mapaComments.get(flag.contentId);

      return {
        flagId: flag.id,
        tipo: flag.tipo,
        contentId: flag.contentId,
        origem: flag.origem,
        motivo: flag.motivo ? MOTIVOS_LABEL[flag.motivo] : null,
        classificacao: flag.classificacao,
        detalhes: flag.detalhes,
        createdAt: flag.createdAt,
        reporter: flag.reporter,
        denuncias: denunciasPor.get(chave) ?? 0,

        conteudo: comment
          ? {
              existe: true,
              content: comment.content,
              imageUrl: null,
              createdAt: comment.createdAt,
              oculto: comment.oculto,
              ocultoMotivo: comment.ocultoMotivo,
              author: comment.author,
              post: {
                id: comment.post.id,
                content: comment.post.content.slice(0, 140),
                authorName: comment.post.author.name,
              },
            }
          : {
              existe: false,
              content: null,
            },
      };
    });

    return NextResponse.json({
      situacao,
      items,
    });
  } catch (error) {
    console.error("Erro na central de moderação:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar a moderação.",
      },
      {
        status: 500,
      }
    );
  }
}

/* ============================================================
   PATCH
   ============================================================ */

export async function PATCH(request: Request) {
  try {
    const guard = await exigirAdmin(request);
    if (guard.erro) {
      return guard.erro;
    }

    const adminId = guard.usuario.id;

    const body = await request.json();

    const flagId = typeof body.flagId === "string" ? body.flagId : "";
    const acao =
      body.acao === "MANTIDO" ||
      body.acao === "RESTAURADO" ||
      body.acao === "EXCLUIDO"
        ? body.acao
        : null;

    const nota = typeof body.nota === "string" ? body.nota.trim() : "";

    if (!flagId || !acao) {
      return NextResponse.json(
        {
          error: "Sinalização ou ação inválida.",
        },
        {
          status: 400,
        }
      );
    }

    const flag = await prisma.contentFlag.findUnique({
      where: {
        id: flagId,
      },
    });

    if (!flag) {
      return NextResponse.json(
        {
          error: "Sinalização não encontrada.",
        },
        {
          status: 404,
        }
      );
    }

    if (flag.status === "RESOLVIDA") {
      return NextResponse.json(
        {
          error: "Essa sinalização já foi resolvida.",
        },
        {
          status: 400,
        }
      );
    }

    /**
     * Puxa o conteúdo atual da sinalização — se ainda existir.
     */
    const conteudo =
      flag.tipo === "POST"
        ? await prisma.post.findUnique({
            where: { id: flag.contentId },
            select: { content: true },
          })
        : await prisma.comment.findUnique({
            where: { id: flag.contentId },
            select: { content: true },
          });

    const conteudoResumo = conteudo?.content?.slice(0, 200) ?? null;

    if (acao === "EXCLUIDO") {
      if (!conteudo) {
        return NextResponse.json(
          {
            error: "O conteúdo já não existe mais.",
          },
          {
            status: 400,
          }
        );
      }

      if (flag.tipo === "POST") {
        await prisma.post.delete({
          where: { id: flag.contentId },
        });
      } else {
        await prisma.comment.delete({
          where: { id: flag.contentId },
        });
      }
    }

    /**
     * MANTIDO ou RESTAURADO: se o conteúdo foi ocultado
     * automaticamente, volta a aparecer.
     */
    if (acao !== "EXCLUIDO" && conteudo) {
      if (flag.tipo === "POST") {
        await prisma.post.update({
          where: { id: flag.contentId },

          data: {
            oculto: false,
            ocultoMotivo: null,
            ocultoEm: null,
          },
        });
      } else {
        await prisma.comment.update({
          where: { id: flag.contentId },

          data: {
            oculto: false,
            ocultoMotivo: null,
            ocultoEm: null,
          },
        });
      }
    }

    /**
     * Fecha a sinalização em questão.
     */
    await prisma.contentFlag.update({
      where: { id: flag.id },

      data: {
        status: "RESOLVIDA",
        resultado: acao,
        reviewedById: adminId,
        reviewedAt: new Date(),
      },
    });

    /**
     * Se a ação foi EXCLUIDO, fecha todas as outras sinalizações
     * pendentes do mesmo conteúdo (deixando a central limpa).
     */
    if (acao === "EXCLUIDO") {
      await prisma.contentFlag.updateMany({
        where: {
          tipo: flag.tipo,
          contentId: flag.contentId,
          status: "PENDENTE",
        },

        data: {
          status: "RESOLVIDA",
          resultado: "EXCLUIDO",
          reviewedById: adminId,
          reviewedAt: new Date(),
        },
      });
    }

    /**
     * Histórico da ação — consulta do administrador.
     */
    await prisma.moderationAction.create({
      data: {
        acao: acao === "MANTIDO" ? "MANTIDO" : acao,
        tipo: flag.tipo,
        contentId: flag.contentId,
        adminId,
        nota: nota || null,
        conteudoResumo,
      },
    });

    return NextResponse.json({
      ok: true,
      mensagem:
        acao === "EXCLUIDO"
          ? "Conteúdo excluído e registrado no histórico."
          : acao === "RESTAURADO"
            ? "Conteúdo restaurado e registrado no histórico."
            : "Conteúdo mantido publicado e registrado no histórico.",
    });
  } catch (error) {
    console.error("Erro ao resolver sinalização:", error);

    return NextResponse.json(
      {
        error: "Não foi possível concluir a ação de moderação.",
      },
      {
        status: 500,
      }
    );
  }
}
