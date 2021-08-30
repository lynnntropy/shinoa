import logger from "./logger";
import environment from "./environment";
import client from "./client";
import { server as graphqlServer } from "./graphql";

const main = async () => {
  logger.info("Starting client...");
  await client.login(environment.TOKEN);

  logger.info("Starting GraphQL server...");
  await graphqlServer.listen();
};

main();
