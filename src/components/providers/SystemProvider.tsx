"use client";

import { AppSchema, PowerSyncDB } from "@/lib/powersync/AppSchema";
import { BackendConnector } from "@/lib/powersync/BackendConnector";
import { useAuth, useSession } from "@clerk/nextjs";
import { PowerSyncContext } from "@powersync/react";
import {
  PowerSyncDatabase,
  WASQLiteOpenFactory,
  WASQLiteVFS,
  createBaseLogger,
  LogLevel,
} from "@powersync/web";
import { wrapPowerSyncWithKysely } from "@powersync/kysely-driver";
import React, { Suspense, useEffect, useMemo } from "react";

const logger = createBaseLogger();
logger.useDefaults();
logger.setLevel(LogLevel.DEBUG);

let _powerSyncDb: PowerSyncDatabase | undefined;
let _db: ReturnType<typeof wrapPowerSyncWithKysely<PowerSyncDB>> | undefined;

function chooseVfs() {
  const isBrowser = typeof window !== "undefined";
  const isSecureContext = isBrowser && globalThis.isSecureContext === true;
  const hasLocks =
    isBrowser && typeof navigator !== "undefined" && typeof navigator.locks !== "undefined";

  // OPFS VFS depends on secure context + Web Locks.
  if (isSecureContext && hasLocks) return WASQLiteVFS.OPFSCoopSyncVFS;

  return WASQLiteVFS.IDBBatchAtomicVFS;
}

function createPowerSyncDb() {
  const vfs = chooseVfs();

  if (vfs !== WASQLiteVFS.OPFSCoopSyncVFS) {
    logger.warn(
      `[PowerSync] Using ${vfs} (OPFS disabled: secure context or navigator.locks unavailable).`,
    );
  }

  return new PowerSyncDatabase({
    schema: AppSchema,
    database: new WASQLiteOpenFactory({
      dbFilename: "bleacherrentalsVFS.db",
      vfs,
      flags: {
        enableMultiTabs: typeof SharedWorker !== "undefined",
        ssrMode: false,
      },
      // Use pre-bundled worker from public/@powersync/ (required for Turbopack)
      worker: "/@powersync/worker/WASQLiteDB.umd.js",
    }),
    flags: {
      enableMultiTabs: typeof SharedWorker !== "undefined",
      disableSSRWarning: true,
    },
    sync: {
      // Use pre-bundled sync worker from public/@powersync/ (required for Turbopack)
      worker: "/@powersync/worker/SharedSyncImplementation.umd.js",
    },
  });
}

export function getPowerSyncDb(): PowerSyncDatabase {
  if (typeof window === "undefined") {
    throw new Error("PowerSync DB is only available in the browser");
  }

  _powerSyncDb ??= createPowerSyncDb();
  return _powerSyncDb;
}

export function getDb() {
  _db ??= wrapPowerSyncWithKysely<PowerSyncDB>(getPowerSyncDb());
  return _db;
}

function createBoundLazyProxy<T extends object>(getInstance: () => T): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const instance = getInstance();
      const value = (instance as any)[prop as any];
      return typeof value === "function" ? value.bind(instance) : value;
    },
  });
}

// Backwards-compatible exports so existing imports keep working.
export const powerSyncDb: PowerSyncDatabase = createBoundLazyProxy(getPowerSyncDb);
export const db: ReturnType<typeof wrapPowerSyncWithKysely<PowerSyncDB>> =
  createBoundLazyProxy(getDb);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuth();
  const { session } = useSession();

  const connector = useMemo(
    () => (session?.getToken ? new BackendConnector(session) : undefined),
    [session?.id],
  );

  const instance = useMemo(() => {
    if (!isSignedIn || !connector) return undefined;
    return getPowerSyncDb();
  }, [connector, isSignedIn]);

  useEffect(() => {
    if (!instance || !connector) return;

    instance.connect(connector, {
      params: { app: "web" },
    });

    return () => {
      instance.disconnect?.();
    };
  }, [connector, instance]);

  if (!isSignedIn || !connector || !instance) return null;

  return (
    <Suspense>
      <PowerSyncContext.Provider value={instance}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
