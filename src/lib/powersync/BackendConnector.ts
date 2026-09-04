import { SignedInSessionResource } from "@clerk/types";
import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/web";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { createErrorToastNoThrow } from "@/components/toasts/ErrorToast";

/// Postgres Response codes that we cannot recover from by retrying.
const FATAL_RESPONSE_CODES = [
  // Class 22 — Data Exception
  // Examples include data type mismatch.
  new RegExp("^22...$"),
  // Class 23 — Integrity Constraint Violation.
  // Examples include NOT NULL, FOREIGN KEY and UNIQUE violations.
  new RegExp("^23...$"),
  // INSUFFICIENT PRIVILEGE - typically a row-level security violation
  new RegExp("^42501$"),
];

// function getJwtPayload(token: string) {
//   const base64 = token.split(".")[1];
//   const json = atob(base64.replace(/-/g, "+").replace(/_/g, "/"));
//   return JSON.parse(json);
// }

let _cachedCredentials: { endpoint: string; token: string; expiresAt: number } | null = null;
let _inflight: Promise<{ endpoint: string; token: string }> | null = null;
const CREDENTIALS_TTL_MS = 50_000;

export class BackendConnector implements PowerSyncBackendConnector {
  client: SupabaseClient;
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  constructor(session: SignedInSessionResource | null | undefined) {
    this.client = createClient(this.supabaseUrl, this.supabaseAnonKey, {
      accessToken: async () => {
        const token = await session?.getToken();
        return token ?? null;
      },
    });
  }

  async fetchCredentials() {
    if (_cachedCredentials && Date.now() < _cachedCredentials.expiresAt) {
      return { endpoint: _cachedCredentials.endpoint, token: _cachedCredentials.token };
    }

    if (_inflight) return _inflight;

    _inflight = (async () => {
      const res = await fetch("/api/powersync/credentials?template=powersync", {
        cache: "no-store",
      });
      if (!res.ok) throw new Error(await res.text());
      const { endpoint, token } = await res.json();
      const base64 = token.split(".")[1];
      const payload = JSON.parse(atob(base64.replace(/-/g, "+").replace(/_/g, "/")));
      const expiresAt = payload.exp ? payload.exp * 1000 - 30_000 : Date.now() + CREDENTIALS_TTL_MS;
      _cachedCredentials = { endpoint, token, expiresAt };
      return { endpoint, token };
    })().finally(() => {
      _inflight = null;
    });

    return _inflight;
  }

  async uploadData(database: AbstractPowerSyncDatabase): Promise<void> {
    const transaction = await database.getNextCrudTransaction();

    if (!transaction) {
      return;
    }

    let lastOp: CrudEntry | null = null;
    try {
      // Note: If transactional consistency is important, use database functions
      // or edge functions to process the entire transaction in a single call.
      for (const op of transaction.crud) {
        lastOp = op;
        const table = this.client.from(op.table);
        let result: any = null;
        switch (op.op) {
          case UpdateType.PUT:
            // eslint-disable-next-line no-case-declarations
            const record = { ...op.opData, id: op.id };
            result = await table.upsert(record);
            break;
          case UpdateType.PATCH:
            result = await table.update(op.opData).eq("id", op.id);
            break;
          case UpdateType.DELETE:
            result = await table.delete().eq("id", op.id);
            break;
        }

        if (result.error) {
          console.error(result.error);
          result.error.message = `Could not ${op.op} data to Supabase error: ${JSON.stringify(
            result,
          )}`;
          throw result.error;
        }
      }

      await transaction.complete();
    } catch (ex: any) {
      console.debug(ex);
      if (typeof ex.code == "string" && FATAL_RESPONSE_CODES.some((regex) => regex.test(ex.code))) {
        /**
         * Instead of blocking the queue with these errors,
         * discard the (rest of the) transaction.
         *
         * Note that these errors typically indicate a bug in the application.
         */
        console.error("Data upload error - discarding:", lastOp, ex);

        /**
         * Discarding is silent by design, and that is only tolerable while the
         * lost row is cosmetic. It is not: `PaymentHistory` is written from the
         * app now, and a discarded insert means a payment that the user watched
         * appear, and which then never existed. RLS refusals (42501) and CHECK
         * violations (23514) both land here.
         *
         * The user cannot fix this — it means a bug — but they must not be left
         * believing the money was recorded. Telling them costs nothing and is
         * the difference between a reported bug and a reconciliation mystery.
         */
        createErrorToastNoThrow([
          "A change could not be saved and has been discarded.",
          `${lastOp?.op ?? "change"} on ${lastOp?.table ?? "unknown table"} — ${ex?.message ?? "rejected by the server"}`,
          "Reload and check whether it is there; if not, please report this.",
        ]);

        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error or temporary server error.
        // Throwing an error here causes this call to be retried after a delay.
        throw ex;
      }
    }
  }
}
