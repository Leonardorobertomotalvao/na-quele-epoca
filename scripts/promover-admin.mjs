// ============================================================
// NA MINHA ÉPOCA — promover/demover papel de usuário
//
// Uso:
//   node scripts/promover-admin.mjs <email> <USER|ADMIN>
//
// Exemplo:
//   node scripts/promover-admin.mjs helioroberto115@gmail.com ADMIN
//
// Altera somente a coluna "role" do usuário. Não altera senha
// e não afeta nenhuma outra informação da conta.
// ============================================================
import { createRequire } from "node:module";

const raizProjeto = "G:/na_minha_epoca/";
const require = createRequire(raizProjeto);
const dotenv = require("dotenv");
const { Client } = require("pg");

const email = process.argv[2];
const papel = (process.argv[3] || "ADMIN").toUpperCase();

if (!email) {
  console.error("ERRO: informe o e-mail do usuário.");
  console.error("Ex.: node scripts/promover-admin.mjs meu@email.com ADMIN");
  process.exit(1);
}

if (papel !== "ADMIN" && papel !== "USER") {
  console.error("ERRO: papel deve ser ADMIN ou USER.");
  process.exit(1);
}

dotenv.config();

const client = new Client({ connectionString: process.env.DATABASE_URL });

try {
  await client.connect();

  const resultado = await client.query(
    `UPDATE "user"
       SET "role" = $2
     WHERE lower("email") = lower($1)
     RETURNING id, name, email, "role"`,
    [email, papel]
  );

  if (resultado.rowCount === 0) {
    console.error(`Nenhum usuário encontrado com o e-mail: ${email}`);
    process.exit(1);
  }

  console.log("Papel atualizado:", JSON.stringify(resultado.rows[0], null, 1));
} catch (e) {
  console.error("ERRO:", e.message);
  process.exit(1);
} finally {
  await client.end();
}
