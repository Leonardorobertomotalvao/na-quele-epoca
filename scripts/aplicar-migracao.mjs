// ============================================================
// NA MINHA ÉPOCA — aplicação manual de migração SQL
//
// Uso:
//   node scripts/aplicar-migracao.mjs <caminho-do-migration.sql>
//
// Usado apenas quando o CLI do Prisma não consegue aplicar a
// migração (por exemplo, pela resolução do prisma7.config.ts).
// Executa o arquivo dentro de uma transação e faz um registro
// na tabela _prisma_migrations para manter a contabilidade.
// ============================================================
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const raizProjeto = "G:/na_minha_epoca/";
const require = createRequire(raizProjeto);
const dotenv = require("dotenv");
const { Client } = require("pg");

const arquivo = process.argv[2];

if (!arquivo || !fs.existsSync(arquivo)) {
  console.error("ERRO: informe um migration.sql válido.");
  process.exit(1);
}

dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error("ERRO: DATABASE_URL não definida no .env");
  process.exit(1);
}

const nomeMigration = path.basename(path.dirname(arquivo));
const conteudo = fs.readFileSync(arquivo, "utf8");

/**
 * Divide o SQL em instruções e remove comentários de linha,
 * evitando instruções vazias.
 */
function extrairInstrucoes(sql) {
  const linhas = sql.split("\n");
  const semComentarios = linhas.filter((linha) => {
    const t = linha.trim();
    return t.length > 0 && !t.startsWith("--");
  });
  const texto = semComentarios.join("\n");
  return texto
    .split(";")
    .map((parte) => parte.trim())
    .filter(Boolean);
}

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  // Proteção: aplica somente uma vez
  const feito = await client.query(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL`,
    [nomeMigration]
  );

  if (feito.rowCount > 0) {
    console.log(`Migração "${nomeMigration}" já foi aplicada. Nada a fazer.`);
    process.exit(0);
  }

  const inicio = await client.query(
    `INSERT INTO "_prisma_migrations"
       (id, checksum, started_at, migration_name, logs)
     VALUES
       (gen_random_uuid()::text, 'manual-script', now(), $1, 'aplicada por scripts/aplicar-migracao.mjs')
     RETURNING id`,
    [nomeMigration]
  );

  const idRegistro = inicio.rows[0].id;

  console.log(`Aplicando "${nomeMigration}"...`);
  await client.query("BEGIN");
  try {
    for (const instrucao of extrairInstrucoes(conteudo)) {
      console.log("  ▶", instrucao.split("\n")[0].slice(0, 70) + "…");
      await client.query(instrucao);
    }
    await client.query(
      `UPDATE "_prisma_migrations"
         SET finished_at = now()
       WHERE id = $1`,
      [idRegistro]
    );
    await client.query("COMMIT");
    console.log("Migração aplicada com sucesso e registrada.");
  } catch (erroSQL) {
    await client.query("ROLLBACK");
    await client.query(
      `UPDATE "_prisma_migrations"
         SET rolled_back_at = now(), logs = $2
       WHERE id = $1`,
      [idRegistro, erroSQL.message]
    );
    console.error("FALHA na migração:", erroSQL.message);
    process.exitCode = 1;
  }
} catch (e) {
  console.error("ERRO ao aplicar migração:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
