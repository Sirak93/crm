import vue from '@vitejs/plugin-vue';
import path from 'path';
import {defineConfig, loadEnv, type Plugin} from 'vite';
// Relative path on purpose: Vite bundles a local file into the config, but would hand the
// 'armstock-shared' package to Node, which can't load its extensionless TS imports.
import {BRAND} from '../armstock-shared/src/constants/BrandConstants';

const REQUIRED_ENV = ['PORT', 'VITE_BACKEND_HOST'];

// Vite fills %…% in index.html from env only; brand facts come from armstock-shared.
const brandHtml = (): Plugin => ({
  name: 'brand-html',
  transformIndexHtml: (html) => html.replaceAll('%BRAND_NAME%', BRAND.name),
});

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  const missing = REQUIRED_ENV.filter((name) => !env[name]);
  if (missing.length) {
    throw new Error(`Missing required env variable(s): ${missing.join(', ')} (see .env.example)`);
  }

  return {
    plugins: [vue(), brandHtml()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      port: parseInt(env.PORT!),
      strictPort: true,
      host: '0.0.0.0',
    },
  };
});
