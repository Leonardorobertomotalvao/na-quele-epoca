// ============================================================
// NA MINHA ÉPOCA — app/api/comunidade/brincadeiras/route.ts
// ============================================================
// Envio de brincadeiras pelas pessoas usuárias da comunidade.
//
// Regras aplicadas no servidor:
// - exige sessão autenticada (nunca anônimo)
// - valida todos os campos (lib/validar-brincadeira)
// - moderação básica de palavras impróprias
// - anti-spam: no máximo 5 envios pendentes e 1 envio por minuto
// - imagem opcional, apenas de URL válida do storage do projeto
// - todo envio nasce como PENDENTE (sem publicação automática)
// - detecta duplicidade com nome normalizado (aviso, não bloqueio)
// ============================================================
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  normalizarTexto,
  validarBrincadeira,
} from "@/lib/validar-brincadeira";
import { suggestionIdentityError } from "@/lib/suggestion-identity";

const LIMITE_PENDENTES = 5;
const INTERVALO_ENTRE_ENVIOS_MS = 60 * 1000;

/**
 * GET — lista os envios da própria pessoa para acompanhar o
 * estado (pendente, aprovada, rejeitada). Nunca expõe envios
 * de outras pessoas.
 */
export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Você precisa estar logado para ver seus envios." },
        { status: 401 }
      );
    }

    const envios = await prisma.communityGame.findMany({
      where: {
        authorId: session.user.id,
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        id: true,
        name: true,
        image: true,
        desc: true,
        status: true,
        rejectionReason: true,
        reviewedAt: true,
        categories: true,
        createdAt: true,
      },
    });

    return NextResponse.json(envios);
  } catch (error) {
    console.error("Erro ao listar envios do usuário:", error);

    return NextResponse.json(
      { error: "Não foi possível carregar seus envios." },
      { status: 500 }
    );
  }
}

/**
 * POST — cria um novo envio (sempre como PENDENTE).
 */
export async function POST(request: Request) {
  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        { error: "Você precisa estar logado para enviar uma brincadeira." },
        { status: 401 }
      );
    }

    const identidade = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { email: true, emailVerified: true },
    });
    const identidadeErro = suggestionIdentityError(identidade);
    if (identidadeErro) return NextResponse.json({ error: identidadeErro }, { status: 403 });

    // ============ Anti-spam: esperas e limites por usuário ============

    const [pendentes, ultimoEnvio] = await Promise.all([
      prisma.communityGame.count({
        where: {
          authorId: session.user.id,
          status: "PENDENTE",
        },
      }),

      prisma.communityGame.findFirst({
        where: {
          authorId: session.user.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        select: {
          createdAt: true,
        },
      }),
    ]);

    if (pendentes >= LIMITE_PENDENTES) {
      return NextResponse.json(
        {
          error:
            "Você já tem 5 brincadeiras aguardando revisão. Obrigado pela colaboração! Envie mais após a próxima revisão.",
        },
        { status: 429 }
      );
    }

    if (
      ultimoEnvio &&
      Date.now() - ultimoEnvio.createdAt.getTime() < INTERVALO_ENTRE_ENVIOS_MS
    ) {
      return NextResponse.json(
        {
          error:
            "Aguarde um minuto antes de enviar outra brincadeira. Isso ajuda a manter a comunidade saudável.",
        },
        { status: 429 }
      );
    }

    // ================== Validação completa dos campos ==================

    const corpo = await request.json().catch(() => null);

    if (!corpo) {
      return NextResponse.json(
        { error: "Não conseguimos ler o formulário. Tente novamente." },
        { status: 400 }
      );
    }

    const validação = validarBrincadeira(corpo);

    if (!validação.ok) {
      return NextResponse.json(
        { error: validação.erro },
        { status: 400 }
      );
    }

    const dados = validação.dados;

    // ================== Duplicidade (aviso, não bloqueio) ==================

    const todos = await prisma.communityGame.findMany({
      select: {
        name: true,
      },
    });

    const nomeNormalizado = normalizarTexto(dados.name);

    const duplicidadeDe = todos.find(
      (item) => normalizarTexto(item.name) === nomeNormalizado
    );

    // ================== Criação (sempre PENDENTE) ==================

    const criado = await prisma.communityGame.create({
      data: {
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
        status: "PENDENTE",
        authorId: session.user.id,
      },

      include: {
        author: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    return NextResponse.json(
      {
        ok: true,
        item: {
          id: criado.id,
          status: criado.status,
          createdAt: criado.createdAt,
        },
        possibleDuplicate: duplicidadeDe ? duplicidadeDe.name : null,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Erro ao enviar brincadeira:", error);

    return NextResponse.json(
      { error: "Não foi possível enviar a brincadeira agora." },
      { status: 500 }
    );
  }
}
