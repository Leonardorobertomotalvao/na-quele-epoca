// ============================================================
// NA MINHA ÉPOCA — backup lógico do banco de dados (JSON)
//
// Uso:
//   node scripts/backup-banco.mjs <caminho-do-arquivo-saida>
//
// Faz um dump de dados (SELECT *) de todas as tabelas do projeto
// e grava em um arquivo JSON. Serve como backup antes de migrações
// e como ponto de restauração manual.
// ============================================================
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const raizProjeto = "G:/na_minha_epoca/";
const require = createRequire(raizProjeto);
const dotenv = require("dotenv");
const { Client } = require("pg");

const saida = process.argv[2];

if (!saida) {
  console.error(
    "ERRO: informe o caminho do arquivo de saída.\nEx.: node scripts/backup-banco.mjs E:/BACKUPS/dump.json"
  );
  process.exit(1);
}

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não definida no .env");
  process.exit(1);
}

const tabelas = [
  "user",
  "session",
  "account",
  "verification",
  "post",
  "comment",
  "like",
  "community_game",
];

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  const dump = {
    geradoEm: new Date().toISOString(),
    banco: "postgresql (DATABASE_URL do .env)",
    tabelas: {},
  };

  for (const tabela of tabelas) {
    try {
      const r = await client.query(`SELECT * FROM "${tabela}"`);
      dump.tabelas[tabela] = r.rows;
      console.log(`OK ${tabela}: ${r.rowCount} registro(s)`);
    } catch (e) {
      dump.tabelas[tabela] = { ERRO_TABELA_AUSENTE: e.message };
      console.log(`AVISO ${tabela}: ${e.message}`);
    }
  }

  fs.mkdirSync(path.dirname(saida), { recursive: true });
  fs.writeFileSync(saida, JSON.stringify(dump, null, 2), "utf8");

  const totalRegistros = Object.values(dump.tabelas).reduce((acc, linhas) => {
    if (Array.isArray(linhas)) return acc + linhas.length;
    return acc;
  }, 0);

  console.log("");
  console.log(`Backup salvo em: ${saida}`);
  console.log(`Total de registros: ${totalRegistros}`);
  console.log("Integridade: verifique o tamanho do arquivo e tente ler o JSON.");
} catch (e) {
  console.error("ERRO no backup do banco:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
