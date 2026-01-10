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

export const powerSyncDb = new PowerSyncDatabase({
  schema: AppSchema,
  database: new WASQLiteOpenFactory({
    dbFilename: "bleacherrentalsVFS.db",
    vfs: WASQLiteVFS.OPFSCoopSyncVFS,
    flags: {
      enableMultiTabs: typeof SharedWorker !== "undefined",
      ssrMode: false,
    },
  }),
  flags: {
    enableMultiTabs: typeof SharedWorker !== "undefined",
  },
});

export const db = wrapPowerSyncWithKysely<PowerSyncDB>(powerSyncDb);

export const SystemProvider = ({ children }: { children: React.ReactNode }) => {
  const { isSignedIn } = useAuth();
  const { session } = useSession();
  const connector = useMemo(
    () => (session?.getToken ? new BackendConnector(session) : undefined),
    [session]
  );

  //   const connectOnceRef = React.useRef(false);

  useEffect(() => {
    if (!isSignedIn || !connector) return;

    powerSyncDb.connect(connector, {
      params: { app: "web" },
    });

    return () => {
      powerSyncDb.disconnect?.();
    };
  }, [connector, isSignedIn]);

  if (!isSignedIn || !connector) return null;
  return (
    <Suspense>
      <PowerSyncContext.Provider value={powerSyncDb}>{children}</PowerSyncContext.Provider>
    </Suspense>
  );
};

export default SystemProvider;
