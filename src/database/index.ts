import { createConnection } from "typeorm";
import config from "../config";
import environment from "../environment";
import logger from "../logger";
import KeyValuePair from "./entities/KeyValuePair";

const initializeDatabase = async () => {
  const connection = await createConnection({
    type: "postgres",
    url: environment.DATABASE_URL,
    synchronize: !config.isProduction,
    entities: [KeyValuePair],
  });

  // TODO implement migrations for production

  for (const entity of connection.entityMetadatas) {
    logger.debug(`Lodaded entity ${entity.name}.`);
  }

  logger.info(
    `Database initialized with ${connection.entityMetadatas.length} entities.`
  );
};

export default initializeDatabase;
