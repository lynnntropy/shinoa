import logger from "./logger";
import environment from "./environment";
import client from "./client";
import { server as graphqlServer } from "./graphql";
import * as Sentry from "@sentry/node";
import "@sentry/tracing";

Sentry.init({
  dsn: "https://a16130edcd654fe2a89fe58ab5315a6f@o345514.ingest.sentry.io/5991672",
  tracesSampleRate: 1.0,
});

const main = async () => {
  logger.info("Starting client...");
  await client.login(environment.TOKEN);

  logger.info("Starting GraphQL server...");
  await graphqlServer.listen();
};

main();
