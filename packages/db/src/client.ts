import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { dbEnv } from "./env.js";

export function createPrismaClient(connectionString?: string): PrismaClient {
  const url = connectionString || dbEnv.DATABASE_URL;
  const adapter = new PrismaPg({ connectionString: url });
  return new PrismaClient({ adapter });
}

let defaultClient: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!defaultClient) {
    defaultClient = createPrismaClient();
  }
  return defaultClient;
}

export { PrismaClient };
