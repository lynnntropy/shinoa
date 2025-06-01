import logger from "./logger";
import environment from "./environment";
import client from "./client";
import * as Sentry from "@sentry/node";
import "@sentry/tracing";

Sentry.init({
  dsn: environment.isProduction ? process.env.SENTRY_DSN : undefined,
  tracesSampleRate: 1.0,
});

const main = async () => {
  console.log(JSON.stringify(process.env, undefined, 2));

  logger.info("Starting client...");
  await client.login(environment.TOKEN);
};

main();
