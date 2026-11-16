import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import Module from 'node:module';
import ts from 'typescript';

const state = { session: null, user: null, game: { id: 'g1', name: 'Pega pega', status: 'PENDENTE' }, eventError: false, audit: [] };
const prisma = {
  user: { findUnique: async () => state.user },
  communityGame: {
    findMany: async () => [{ ...state.game, author: { id: 'u1', name: 'Autora', email: 'privado@example.test' } }],
    findUnique: async () => state.game,
    updateMany: async ({ where, data }) => {
      if (state.game.status !== where.status) return { count: 0 };
      state.game = { ...state.game, ...data }; return { count: 1 };
    },
  },
  communityGameModerationEvent: { create: async ({ data }) => { if (state.eventError) throw new Error('audit failed'); state.audit.push(data); } },
  $transaction: async fn => {
    const before = structuredClone(state.game), n = state.audit.length;
    try { return await fn(prisma); } catch (e) { state.game = before; state.audit.length = n; throw e; }
  },
};
const auth = { api: { getSession: async () => state.session } };
const validators = { normalizarTexto: s => s.toLowerCase(), validarBrincadeira: x => ({ ok: true, dados: x }) };
const next = { NextResponse: { json: (body, init = {}) => Response.json(body, init) } };
const originalLoad = Module._load;
Module._load = function (request, parent, isMain) {
  if (request === 'next/server') return next;
  if (request === '@/lib/auth') return { auth };
  if (request === '@/lib/prisma') return { prisma };
  if (request === '@/lib/validar-brincadeira') return validators;
  return originalLoad.call(this, request, parent, isMain);
};
const src = await readFile(new URL('../app/api/admin/brincadeiras/route.ts', import.meta.url), 'utf8');
const mod = new Module(`${process.cwd()}/admin-route-test.cjs`);
mod.filename = `${process.cwd()}/admin-route-test.cjs`;
mod.paths = Module._nodeModulePaths(process.cwd());
mod._compile(ts.transpile(src, { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }), mod.filename);
Module._load = originalLoad;
const response = async promise => { const r = await promise; return { status: r.status, body: await r.json() }; };
const request = body => new Request('http://local/api/admin/brincadeiras', { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const admin = { user: { id: 'admin1' } };

test('admin GET denies anonymous and regular user; only authorized admin sees applicant email', async () => {
  state.session = null; assert.equal((await response(mod.exports.GET(new Request('http://local')))).status, 401);
  state.session = { user: { id: 'u1' } }; state.user = { id: 'u1', role: 'USER' };
  assert.equal((await response(mod.exports.GET(new Request('http://local')))).status, 403);
  state.session = admin; state.user = { id: 'admin1', role: 'ADMIN', name: 'Moderadora' };
  const r = await response(mod.exports.GET(new Request('http://local')));
  assert.equal(r.status, 200); assert.equal(r.body[0].author.email, 'privado@example.test');
});
test('invalid moderation requests and rejection without reason are refused', async () => {
  state.session = admin; state.user = { id: 'admin1', role: 'ADMIN', name: 'Moderadora' };
  assert.equal((await response(mod.exports.PATCH(new Request('http://local', { method: 'PATCH', body: '{' })))).status, 400);
  assert.equal((await response(mod.exports.PATCH(request({ id: 'g1', action: 'rejeitar', rejectionReason: 'x' })))).status, 400);
});
test('approval and rejection write attributed audit events; concurrent decision gets conflict', async () => {
  state.game = { id: 'g1', name: 'Pega pega', status: 'PENDENTE' }; state.audit = [];
  const approved = await response(mod.exports.PATCH(request({ id: 'g1', action: 'aprovar' })));
  assert.equal(approved.status, 200); assert.equal(state.audit[0].moderatorId, 'admin1');
  assert.equal(state.audit[0].action, 'APROVADO');
  assert.equal((await response(mod.exports.PATCH(request({ id: 'g1', action: 'aprovar' })))).status, 400);
  state.game = { id: 'g1', name: 'Pega pega', status: 'PENDENTE' };
  const rejected = await response(mod.exports.PATCH(request({ id: 'g1', action: 'rejeitar', rejectionReason: 'Faltam regras claras.' })));
  assert.equal(rejected.status, 200); assert.equal(state.audit.at(-1).reason, 'Faltam regras claras.');
});
test('audit failure rolls back mocked game state (mock transaction only)', async () => {
  state.game = { id: 'g1', name: 'Pega pega', status: 'PENDENTE' }; state.eventError = true;
  assert.equal((await response(mod.exports.PATCH(request({ id: 'g1', action: 'aprovar' })))).status, 500);
  assert.equal(state.game.status, 'PENDENTE'); state.eventError = false;
});
