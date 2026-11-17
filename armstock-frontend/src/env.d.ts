/// <reference types="element-plus/global" />
import 'vue-router';
import type { UserRole } from 'armstock-shared';

declare module 'vue-router' {
  interface RouteMeta {
    /** Open without login. */
    public?: boolean;
    /** Public page a logged-in user is sent away from (login). */
    guestOnly?: boolean;
    /** Roles allowed to open the page; a page without it is closed to everyone. */
    roles?: UserRole[];
  }
}

declare global {
  interface ImportMetaEnv {
    readonly VITE_BACKEND_HOST: string;
    readonly VITE_ENABLE_LOGS: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}
