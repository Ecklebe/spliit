// @auth/prisma-adapter ships ESM-only (no CJS build), same class of issue as
// the zitadel provider shim next to this file - see that file's comment.
// src/lib/auth.ts spreads this adapter's return value and overrides
// createUser itself, so an empty object is a sufficient stand-in for tests
// (none of which exercise real sign-in/adapter persistence).
export function PrismaAdapter() {
  return {}
}
