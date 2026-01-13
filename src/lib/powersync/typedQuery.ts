// import type { CompiledQuery } from "kysely";
// import { useQuery } from "@powersync/react";

// export type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
//   ? (<T>() => T extends B ? 1 : 2) extends <T>() => T extends A ? 1 : 2
//     ? true
//     : false
//   : false;

// export type CompiledResultOf<C> = C extends CompiledQuery<infer R> ? R : never;

// // ✅ makes a red squiggle if mismatch, returns nothing, no `never` poison.
// export function assertExact<Actual, Expected>(_ok: Equal<Actual, Expected>) {
//   // runtime no-op
// }

// type EnsureExact<Actual, Expected> = Equal<Actual, Expected> extends true
//   ? {}
//   : {
//       __TYPE_MISMATCH__: {
//         actual: Actual;
//         expected: Expected;
//       };
//     };

// export function useTypedQuery<TExpected, C extends CompiledQuery<any>>(
//   compiled: C & EnsureExact<CompiledResultOf<C>, TExpected>
// ) {
//   return useQuery<TExpected>(
//     compiled.sql ?? "select 1 where 0",
//     (compiled.parameters as any[]) ?? []
//   );
// }

import type { CompiledQuery } from "kysely";
import { useQuery } from "@powersync/react";

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
