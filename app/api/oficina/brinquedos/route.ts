// ============================================================
// NA MINHA ÉPOCA — app/api/oficina/brinquedos/route.ts
// ============================================================
// BRINQUEDOS DA OFICINA CRIADOS PELA COMUNIDADE.
//
// GET   /api/oficina/brinquedos?publico=1
//         → brinquedos APROVADOS (para a Oficina oficial).
//       /api/oficina/brinquedos?meus=1
//         → envios do usuário atual (com status de cada um).
//
// POST  /api/oficina/brinquedos
//         body: campos do brinquedo (lib/validar-brinquedo)
//
// Regras:
// - envios nascem SEMPRE como PENDENTE (nada de auto-aprovação);
// - somente usuários autenticados enviam;
// - a validação completa roda no servidor;
// - proteções contra envio abusivo: no máximo 5 envios
//   aguardando revisão por pessoa e 1 minuto entre envios;
// - texto claramente impróprio é barrado pelo classificador.
// ============================================================
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { validarBrinquedo } from "@/lib/validar-brinquedo";

const LIMITE_PENDENTES_POR_USUARIO = 5;
const COOLDOWN_ENVIO_MS = 60 * 1000;

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

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const publico = searchParams.get("publico") === "1";
    const meus = searchParams.get("meus") === "1";

    if (publico) {
      const aprovados = await prisma.workshopToy.findMany({
        where: {
          status: "APROVADO",
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 300,

        select: PROJECAO,
      });

      return NextResponse.json(aprovados);
    }

    if (meus) {
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user) {
        return NextResponse.json([], {
          status: 200,
        });
      }

      const meus = await prisma.workshopToy.findMany({
        where: {
          authorId: session.user.id,
        },

        orderBy: {
          createdAt: "desc",
        },

        take: 50,

        select: PROJECAO,
      });

      return NextResponse.json(meus);
    }

    return NextResponse.json(
      {
        error: "Informe o tipo de listagem (publico ou meus).",
      },
      {
        status: 400,
      }
    );
  } catch (error) {
    console.error("Erro ao listar brinquedos da oficina:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar os brinquedos.",
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
          error: "Você precisa estar logado para enviar um brinquedo.",
        },
        {
          status: 401,
        }
      );
    }

    const body = await request.json();

    /**
     * Validação completa no servidor.
     */
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

    /**
     * Proteção anti-spam: limite de envios aguardando revisão
     * e um mínimo de tempo entre envios.
     */
    const pendentesDoUsuario = await prisma.workshopToy.count({
      where: {
        authorId: session.user.id,
        status: {
          in: ["PENDENTE", "CORRECAO_SOLICITADA"],
        },
      },
    });

    if (pendentesDoUsuario >= LIMITE_PENDENTES_POR_USUARIO) {
      return NextResponse.json(
        {
          error:
            "Você já tem 5 brinquedos aguardando revisão. Espere a análise antes de enviar mais.",
        },
        {
          status: 429,
        }
      );
    }

    const ultimoEnvio = await prisma.workshopToy.findFirst({
      where: {
        authorId: session.user.id,
      },

      orderBy: {
        createdAt: "desc",
      },

      select: {
        createdAt: true,
      },
    });

    if (
      ultimoEnvio &&
      Date.now() - new Date(ultimoEnvio.createdAt).getTime() <
        COOLDOWN_ENVIO_MS
    ) {
      return NextResponse.json(
        {
          error:
            "Envie um brinquedo de cada vez: espere um minutinho antes de enviar outro.",
        },
        {
          status: 429,
        }
      );
    }

    /**
     * Sempre nasce PENDENTE — nada de auto-aprovação, nem a sua.
     */
    const brinquedo = await prisma.workshopToy.create({
      data: {
        ...resultado.dados,
        status: "PENDENTE",
        authorId: session.user.id,
      },

      select: PROJECAO,
    });

    return NextResponse.json(
      {
        ok: true,
        brinquedo,
        mensagem:
          "Brinquedo enviado! Ele está aguardando a revisão de um administrador.",
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Erro ao enviar brinquedo:", error);

    return NextResponse.json(
      {
        error: "Não foi possível enviar o brinquedo.",
      },
      {
        status: 500,
      }
    );
  }
}
