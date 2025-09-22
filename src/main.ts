import { client } from "./client.ts";
import {
  configure as configureLogTape,
  getConsoleSink,
} from "@logtape/logtape";
import { logger } from "./logger.ts";
import { env } from "./env.ts";

// todo init Sentry, probably

await configureLogTape({
  sinks: { console: getConsoleSink() },
  loggers: [
    { category: "shinoa", lowestLevel: "debug", sinks: ["console"] },
    { category: ["logtape", "meta"], sinks: [] },
  ],
});

logger.info("Starting client...");

await client.login(env.TOKEN);
