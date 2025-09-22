import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./.generated/prisma/client.ts";
import { env } from "./env.ts";

const pool = new PrismaPg({ connectionString: env.DATABASE_URL });

export const prisma = new PrismaClient({ adapter: pool });
