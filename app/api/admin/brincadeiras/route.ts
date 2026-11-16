// ============================================================
// NA MINHA ÉPOCA — app/api/admin/brincadeiras/route.ts
// ============================================================
// Área de moderação das brincadeiras da comunidade.
//
// Somente usuários com papel ADMIN (banco, coluna "user"."role")
// acessam este recurso. Usuários comuns recebem 403 e não
// podem aprovar, rejeitar ou editar envios.
//
// GET    — lista todos os envios com autor e avisos de duplicidade.
// PATCH  — salva edições, aprova ou rejeita um envio.
// ============================================================
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizarTexto,
  validarBrincadeira,
} from "@/lib/validar-brincadeira";
import type { BrincadeiraValida } from "@/lib/validar-brincadeira";

type Role = "USER" | "ADMIN";

/**
 * Verifica a sessão e o papel do usuário.
 * Devolve o usuário com papel ADMIN ou uma resposta de erro.
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
        name: true,
    },
  });

  if (!usuario || (usuario.role as Role) !== "ADMIN") {
    return {
      erro: NextResponse.json(
        { error: "Somente administradores podem moderar as brincadeiras." },
        { status: 403 }
      ),
    };
  }

  return { usuario };
}

/**
 * GET — lista todos os envios, agrupáveis no painel pelo status.
 * Inclui o autor (nome e avatar) e avisos de duplicidade.
 */
export async function GET(request: Request) {
  try {
    const { erro } = await exigirAdmin(request);

    if (erro) {
      return erro;
    }

    const envios = await prisma.communityGame.findMany({
      orderBy: [{ createdAt: "desc" }],

      include: {
        author: {
          select: {
            id: true,
            name: true,
            image: true,
            email: true,
          },
        },
      },
    });

    /**
     * Duplicidades: nomes com mesma forma normalizada.
     */
    const nomesPorId = new Map<string, string>();
    for (const envio of envios) {
      nomesPorId.set(envio.id, normalizarTexto(envio.name));
    }

    const lista = envios.map((envio) => {
      const normal = nomesPorId.get(envio.id)!;

      const outroIgual = envios.find(
        (outro) =>
          outro.id !== envio.id && nomesPorId.get(outro.id) === normal
      );

      return {
        ...envio,
        duplicidadeDe: outroIgual ? outroIgual.name : null,
      };
    });

    return NextResponse.json(lista);
  } catch (error) {
    console.error("Erro na moderação (GET):", error);

    return NextResponse.json(
      { error: "Não foi possível carregar os envios para moderação." },
      { status: 500 }
    );
  }
}

/**
 * PATCH — salva edições / aprova / rejeita um envio.
 */
export async function PATCH(request: Request) {
  try {
    const { erro, usuario: admin } = await exigirAdmin(request);

    if (erro) {
      return erro;
    }
    if (!admin) return NextResponse.json({ error: "Somente administradores podem moderar." }, { status: 403 });

    const corpo = await request.json().catch(() => null);

    if (!corpo || typeof corpo !== "object") {
      return NextResponse.json(
        { error: "Requisição inválida." },
        { status: 400 }
      );
    }

    const { id, action, edits, rejectionReason } = corpo as {
      id?: string;
      action?: string;
      edits?: unknown;
      rejectionReason?: unknown;
    };

    if (!id) {
      return NextResponse.json(
        { error: "Envio não informado." },
        { status: 400 }
      );
    }

    const envio = await prisma.communityGame.findUnique({
      where: { id },
    });

    if (!envio) {
      return NextResponse.json(
        { error: "Envio não encontrado." },
        { status: 404 }
      );
    }

    if (envio.status !== "PENDENTE") {
      return NextResponse.json(
        {
          error:
            "Somente envios pendentes podem ser editados, aprovados ou rejeitados.",
        },
        { status: 400 }
      );
    }

    // ================== SALVAR EDIÇÕES ==================

    if (action === "salvar") {
      if (!edits) {
        return NextResponse.json(
          { error: "Nada para salvar." },
          { status: 400 }
        );
      }

      const validação = validarBrincadeira(edits);

      if (!validação.ok) {
        return NextResponse.json(
          { error: validação.erro },
          { status: 400 }
        );
      }

      const salvo = await prisma.communityGame.update({
        where: { id, status: "PENDENTE" },
        data: camposDeConteudo(validação.dados),
      });

      return NextResponse.json({ ok: true, item: salvo });
    }

    // ================== APROVAR ==================

    if (action === "aprovar") {
      let datas = {};

      if (edits) {
        const validação = validarBrincadeira(edits);

        if (!validação.ok) {
          return NextResponse.json(
            { error: validação.erro },
            { status: 400 }
          );
        }

        datas = camposDeConteudo(validação.dados);
      }

      const salvo = await registrarDecisao({
        id, moderator: admin, action: "APROVADO", reason: null,
        data: { ...datas, status: "APROVADO", reviewedAt: new Date() },
      });
      if (!salvo) return NextResponse.json({ error: "Este envio já foi atualizado. Recarregue a lista." }, { status: 409 });

      return NextResponse.json({ ok: true, item: salvo });
    }

    // ================== REJEITAR ==================

    if (action === "rejeitar") {
      const motivo =
        typeof rejectionReason === "string"
          ? rejectionReason.trim()
          : "";

      if (motivo.length < 5 || motivo.length > 400) {
        return NextResponse.json(
          {
            error:
              "Escreva um motivo claro (entre 5 e 400 caracteres) para comunicar bem a pessoa autora.",
          },
          { status: 400 }
        );
      }

      const salvo = await registrarDecisao({
        id, moderator: admin, action: "REJEITADO", reason: motivo,
        data: { status: "REJEITADO", rejectionReason: motivo, reviewedAt: new Date() },
      });
      if (!salvo) return NextResponse.json({ error: "Este envio já foi atualizado. Recarregue a lista." }, { status: 409 });

      return NextResponse.json({ ok: true, item: salvo });
    }

    return NextResponse.json(
      { error: "Ação inválida. Use aprovar, rejeitar ou salvar." },
      { status: 400 }
    );
  } catch (error) {
    console.error("Erro na moderação (PATCH):", error);
    if (error && typeof error === "object" && "code" in error && error.code === "P2025") {
      return NextResponse.json({ error: "Este envio já foi atualizado. Recarregue a lista antes de continuar." }, { status: 409 });
    }

    return NextResponse.json(
      { error: "Não foi possível processar a moderação agora." },
      { status: 500 }
    );
  }
}

async function registrarDecisao({ id, moderator, action, reason, data }: {
  id: string; moderator: { id: string; name: string };
  action: "APROVADO" | "REJEITADO"; reason: string | null; data: Record<string, unknown>;
}) {
  return prisma.$transaction(async (tx) => {
    const update = await tx.communityGame.updateMany({ where: { id, status: "PENDENTE" }, data });
    if (update.count !== 1) return null;
    await tx.communityGameModerationEvent.create({ data: {
      communityGameId: id, gameName: String(data.name ?? ""),
      moderatorId: moderator.id, moderatorName: moderator.name,
      action, reason,
    } });
    return tx.communityGame.findUnique({ where: { id } });
  });
}

/**
 * Converte os dados validados em campos do banco.
 */
function camposDeConteudo(dados: BrincadeiraValida) {
  return {
    name: dados.name,
    image: dados.image,
    desc: dados.desc,
    how: dados.how,
    materials: dados.materials,
    location: dados.location,
    benefits: dados.benefits,
    minPlayers: dados.minPlayers,
    minAge: dados.minAge,
    categories: dados.categories,
    safety: dados.safety,
    supervision: dados.supervision,
  };
}
