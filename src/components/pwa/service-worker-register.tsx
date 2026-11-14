"use client";

import * as React from "react";

/**
 * Registra o service worker do PWA. A falha é silenciosa para não impactar
 * apps que rodam em ambientes sem suporte a service workers.
 */
export function ServiceWorkerRegister() {
  React.useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    };

    register();
  }, []);

  return null;
}
