import { NextResponse } from "next/server";
import { put } from "@vercel/blob";

import { auth } from "@/lib/auth";

/**
 * ============================================================
 * UPLOAD DE IMAGENS DA COMUNIDADE
 * ============================================================
 */

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export async function POST(request: Request) {
  try {
    // Verifica se o usuário está logado
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session?.user) {
      return NextResponse.json(
        {
          error: "Você precisa estar logado para enviar imagens.",
        },
        {
          status: 401,
        }
      );
    }

    // Recebe o arquivo
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json(
        {
          error: "Nenhuma imagem foi selecionada.",
        },
        {
          status: 400,
        }
      );
    }

    // Verifica o formato
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Formato inválido. Use uma imagem JPG, PNG ou WebP.",
        },
        {
          status: 400,
        }
      );
    }

    // Verifica o tamanho
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          error: "A imagem deve ter no máximo 5 MB.",
        },
        {
          status: 400,
        }
      );
    }

    // Confere a assinatura e determina a extensão pelo conteúdo aceito.
    const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const extension = file.type === "image/jpeg" && bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      ? "jpg"
      : file.type === "image/png" && [137, 80, 78, 71, 13, 10, 26, 10].every((value, i) => bytes[i] === value)
      ? "png"
      : file.type === "image/webp" && String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
      ? "webp" : null;
    if (!extension) return NextResponse.json({ error: "O conteúdo do arquivo não corresponde a uma imagem JPG, PNG ou WebP válida." }, { status: 400 });

    // Cria um nome único
    const fileName =
      `comunidade/${session.user.id}/${crypto.randomUUID()}.${extension}`;

    // Envia a imagem para o Vercel Blob
    const blob = await put(fileName, file, {
      access: "public",
      addRandomSuffix: false,
    });

    return NextResponse.json(
      {
        url: blob.url,
        pathname: blob.pathname,
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error("Erro ao enviar imagem:", error);

    return NextResponse.json(
      {
        error: "Não foi possível enviar a imagem.",
      },
      {
        status: 500,
      }
    );
  }
}
