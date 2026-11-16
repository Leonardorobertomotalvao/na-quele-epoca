export type SuggestionIdentity = { email: string; emailVerified: boolean } | null;

export function suggestionIdentityError(identity: SuggestionIdentity): string | null {
  if (!identity?.emailVerified || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identity.email.trim())) {
    return "Confirme um e-mail válido na sua conta antes de sugerir uma brincadeira.";
  }
  return null;
}
