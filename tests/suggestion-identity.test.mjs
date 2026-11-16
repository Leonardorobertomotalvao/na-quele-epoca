import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
import Module from 'node:module';

const source = await readFile(new URL('../lib/suggestion-identity.ts', import.meta.url), 'utf8');
const compiled = new Module('suggestion-identity.cjs');
compiled._compile(ts.transpile(source, { module: ts.ModuleKind.CommonJS }), 'suggestion-identity.cjs');
const { suggestionIdentityError } = compiled.exports;

test('verified account email is accepted', () => {
  assert.equal(suggestionIdentityError({ email: 'aluno@example.com', emailVerified: true }), null);
});
test('missing, unverified and malformed account email are rejected', () => {
  for (const identity of [null, { email: 'a@example.com', emailVerified: false }, { email: 'invalid', emailVerified: true }]) {
    assert.match(suggestionIdentityError(identity), /Confirme um e-mail válido/);
  }
});
test('public suggestion API binds author to session and does not select email', async () => {
  const route = await readFile(new URL('../app/api/comunidade/brincadeiras/route.ts', import.meta.url), 'utf8');
  assert.match(route, /authorId: session\.user\.id/);
  assert.doesNotMatch(route, /author:\s*\{[\s\S]*?email:\s*true/);
});

test('Prisma import is inert during build; real query still rejects missing DATABASE_URL', async () => {
  const prismaSource = await readFile(new URL('../lib/prisma.ts', import.meta.url), 'utf8');
  const filename = new URL('../lib/prisma.ts', import.meta.url).pathname;
  const module = new Module(filename);
  module.filename = filename;
  module.paths = Module._nodeModulePaths(new URL('../lib', import.meta.url).pathname);
  const original = Module._load;
  const hadUrl = Object.hasOwn(process.env, 'DATABASE_URL');
  const oldUrl = process.env.DATABASE_URL;
  delete process.env.DATABASE_URL;
  Module._load = function (name, parent, isMain) {
    if (name === '@prisma/adapter-pg') return { PrismaPg: class {} };
    if (name === '../generated/prisma/client') return { PrismaClient: class {} };
    return original.call(this, name, parent, isMain);
  };
  try {
    module._compile(ts.transpile(prismaSource, { module: ts.ModuleKind.CommonJS }), filename);
    assert.throws(() => module.exports.prisma.user.findUnique(), /DATABASE_URL não foi definida/);
  } finally {
    Module._load = original;
    if (hadUrl) process.env.DATABASE_URL = oldUrl;
    else delete process.env.DATABASE_URL;
  }
});
