import Sqids from "sqids";
import { compare, hash } from "bcryptjs";

export const ensureUrlHasScheme = (url: string): string => {
  if (!/^https?:\/\//i.test(url)) {
    return `https://${url}`;
  }
  return url;
};

let counter = 0;

export const getSqid = () => {
  counter = (counter + 1) % 2 ** 31;

  const sqid = new Sqids();
  return sqid.encode([Date.now(), counter]);
};

export type CamelCaseToSnakeCase<S extends string> =
  S extends `${infer First}${infer Rest}`
    ? `${First extends Capitalize<First> ? `_${Lowercase<First>}` : First}${CamelCaseToSnakeCase<Rest>}`
    : S;

export type ObjectKeysToSnakeCase<T> = {
  [K in keyof T as K extends string ? CamelCaseToSnakeCase<K> : never]: T[K];
};

export const hashPassword = async (password: string): Promise<string> => {
  return await hash(password, 10);
};

export const validatePassword = async (
  password: string,
  hashedPassword: string,
): Promise<boolean> => {
  return await compare(password, hashedPassword);
};
