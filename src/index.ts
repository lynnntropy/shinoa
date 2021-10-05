import logger from "./logger";
import environment from "./environment";
import client from "./client";
import { server as graphqlServer } from "./graphql";
import * as Sentry from "@sentry/node";
import "@sentry/tracing";

Sentry.init({
  dsn: environment.isProduction ? process.env.SENTRY_DSN : undefined,
  tracesSampleRate: 1.0,
});

const main = async () => {
  logger.info("Starting client...");
  await client.login(environment.TOKEN);

  logger.info("Starting GraphQL server...");
  await graphqlServer.listen();
};

main();
