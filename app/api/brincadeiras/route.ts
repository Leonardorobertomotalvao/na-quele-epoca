// ============================================================
// NA MINHA ÉPOCA — app/api/brincadeiras/route.ts
// ============================================================
// Catálogo público das brincadeiras enviadas pela comunidade.
//
// Devolve somente brincadeiras APROVADAS, já no formato usado
// pela página inicial (cards, modal, pesquisa e categorias),
// preservando a identidade visual existente.
// ============================================================
import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

const CORES = ["yellow", "coral", "purple", "blue", "green", "orange"];
const ICONES = ["✦", "↗", "⌂", "≈", "⌁", "◎", "⚫"];

/**
 * Hash simples e estável: a mesma brincadeira recebe sempre
 * a mesma cor/ícone, mantendo a paleta do site.
 */
function hashDe(texto: string): number {
  let total = 0;
  for (let index = 0; index < texto.length; index += 1) {
    total += texto.charCodeAt(index);
  }
  return total;
}

export async function GET() {
  try {
    const aprovadas = await prisma.communityGame.findMany({
      where: {
        status: "APROVADO",
      },

      orderBy: {
        createdAt: "asc",
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

    const catalogo = aprovadas.map((item) => {
      const hash = hashDe(item.name);

      return {
        id: item.id,
        source: "comunidade",

        name: item.name,
        image: item.image,
        icon: ICONES[hash % ICONES.length],
        color: CORES[hash % CORES.length],

        category: item.categories,
        desc: item.desc,
        how: item.how,
        materials: item.materials,
        players: `${item.minPlayers} ou mais`,
        age: `A partir de ${item.minAge} anos`,
        benefits: item.benefits,

        // ===== campos extras das brincadeiras da comunidade =====
        location: item.location,
        safety: item.safety,
        supervision: item.supervision,

        authorName: item.author?.name || "Comunidade",
        approvedAt:
          item.reviewedAt?.toISOString() ?? item.updatedAt.toISOString(),
      };
    });

    return NextResponse.json(catalogo);
  } catch (error) {
    console.error("Erro ao carregar catálogo da comunidade:", error);

    return NextResponse.json(
      {
        error: "Não foi possível carregar as brincadeiras da comunidade.",
      },
      {
        status: 500,
      }
    );
  }
}
