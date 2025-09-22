import { createEnv } from "@t3-oss/env-core";
import { z } from "@zod/zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.url(),
    TOKEN: z.string().min(1),
  },

  runtimeEnv: Deno.env.toObject(),

  emptyStringAsUndefined: true,
});
