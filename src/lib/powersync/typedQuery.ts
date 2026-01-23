"use client";
import type { CompiledQuery } from "kysely";
import { useQuery } from "@powersync/react";
import { db, powerSyncDb } from "@/components/providers/SystemProvider";

export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
  ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
    ? true
    : false
  : false;

export type CompiledResultOf<C> = C extends CompiledQuery<infer R> ? R : never;

type EnsureExact<Actual, Expected> = Equal<Actual, Expected> extends true
  ? {}
  : { __TYPE_MISMATCH__: { actual: Actual; expected: Expected } };

// phantom helper (runtime = undefined, compile-time = T)
export const expect = <T>() => undefined as unknown as T;

export function useTypedQuery<C extends CompiledQuery<any>, TExpected>(
  compiled: C & EnsureExact<CompiledResultOf<C>, TExpected>,
  _expected: TExpected // required so you can't forget the check
) {
  return useQuery<TExpected>(compiled.sql, compiled.parameters as any[]);
}

export function typedGetAll<C extends CompiledQuery<any>, TExpected>(
  compiled: C & EnsureExact<CompiledResultOf<C>, TExpected>,
  _expected: TExpected // required so you can't forget the check
) {
  return powerSyncDb.getAll<TExpected>(compiled.sql, compiled.parameters as any[]);
}

/**
 * Execute a compiled Kysely query (INSERT/UPDATE/DELETE).
 *
 * Note: `execute()` returns a driver-specific result shape, so this helper
 * focuses on making sure the SQL was built via the typed `db` instance.
 */
export function typedExecute(compiled: CompiledQuery<any>) {
  return powerSyncDb.execute(compiled.sql, compiled.parameters as any[]);
}
