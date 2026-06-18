/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_NAME?: string;
  readonly VITE_API_URL?: string;
  // Add any other VITE_ variables you use here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
