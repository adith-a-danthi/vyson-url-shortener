import type { TursoDbEnv } from "./db";

export type KVBindings = {
  BLACKLIST: KVNamespace;
};

export type ApplicationBindings = TursoDbEnv & KVBindings;

export type Blacklist = {
  blacklistedKeys: string[];
};
