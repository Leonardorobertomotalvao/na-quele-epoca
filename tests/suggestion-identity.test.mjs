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
