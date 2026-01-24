/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_DB_MODE: string;
    readonly VITE_SUPABASE_URL: string;
    readonly VITE_SUPABASE_ANON_KEY: string;
    readonly VITE_KIMI_API_KEY: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
