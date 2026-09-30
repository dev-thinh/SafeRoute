/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GOONG_MAPTILES_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
