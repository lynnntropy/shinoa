import { client } from "./client.ts";
import {
  configure as configureLogTape,
  getConsoleSink,
} from "@logtape/logtape";
import { prettyFormatter } from "@logtape/pretty";
import { logger } from "./logger.ts";
import { env } from "./env.ts";
import { AsyncLocalStorage } from "node:async_hooks";

// todo init Sentry, probably

await configureLogTape({
  sinks: {
    console: getConsoleSink({ formatter: prettyFormatter }),
  },

  contextLocalStorage: new AsyncLocalStorage(),

  loggers: [
    { category: "shinoa", lowestLevel: "debug", sinks: ["console"] },
    { category: ["logtape", "meta"], sinks: [] },
  ],
});

logger.info("Starting client...");
await client.login(env.TOKEN);
