import { SignedInSessionResource } from "@clerk/types";
import {
  AbstractPowerSyncDatabase,
  CrudEntry,
  PowerSyncBackendConnector,
  UpdateType,
} from "@powersync/web";
import { createClient, SupabaseClient } from "@supabase/supabase-js";

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
    const res = await fetch("/api/powersync/credentials?template=powersync", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(await res.text());
    const { endpoint, token } = await res.json();

    console.debug("Fetched PowerSync credentials from Clerk");
    // console.log(getJwtPayload(token));

    return {
      endpoint: endpoint,
      token: token,
    };
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
            result
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
         * If protecting against data loss is important, save the failing records
         * elsewhere instead of discarding, and/or notify the user.
         */
        console.error("Data upload error - discarding:", lastOp, ex);
        await transaction.complete();
      } else {
        // Error may be retryable - e.g. network error or temporary server error.
        // Throwing an error here causes this call to be retried after a delay.
        throw ex;
      }
    }
  }
}
