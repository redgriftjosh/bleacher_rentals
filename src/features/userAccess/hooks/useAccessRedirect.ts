import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { MergedAccessConfig } from "../accessConfig";

export function useAccessRedirect(config: MergedAccessConfig | null) {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    if (!config) return;

    const isAllowed = config.allowedPaths.some((p) => pathname.startsWith(p));
    if (!isAllowed) {
      router.replace(config.defaultRedirect);
    }
  }, [config, pathname, router]);
}
