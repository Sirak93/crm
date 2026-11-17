declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_BACKEND_HOST: string;
  readonly VITE_ENABLE_LOGS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
