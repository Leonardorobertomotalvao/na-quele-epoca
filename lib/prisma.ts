import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

let client: PrismaClient | undefined;

function getClient(): PrismaClient {
  if (client) return client;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL não foi definida no ambiente de execução");
  }

  client = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
  return client;
}

/** Adia a inicialização até uma operação real, sem mascarar URL ausente. */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property) {
    if (typeof property !== "string") return Reflect.get(getClient(), property);

    return new Proxy(() => undefined, {
      get(_delegate, operation) {
        return (...args: unknown[]) => {
          const delegate = (getClient() as unknown as Record<string, unknown>)[property];
          if (typeof delegate !== "object" || delegate === null) {
            if (typeof delegate === "function") return delegate.apply(getClient(), args);
            return delegate;
          }
          const method = (delegate as Record<PropertyKey, unknown>)[operation];
          if (typeof method !== "function") return method;
          return method.apply(delegate, args);
        };
      },
      apply(_delegate, _thisArg, args) {
        const method = (getClient() as unknown as Record<string, unknown>)[property];
        if (typeof method !== "function") throw new TypeError(`Prisma property ${property} is not callable`);
        return method.apply(getClient(), args);
      },
    });
  },
});
