/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_AI_MODE?: "simulated" | "remote";
  readonly VITE_DATA_MODE?: "local" | "supabase";
}
