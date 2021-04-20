import { denodb, log, async } from "../../deps.ts";
import ConfigItem from "./models/ConfigItem.ts";
import config from "../config.ts";

const connection = new denodb.PostgresConnector({
  host: config.environment.DATABASE_HOST,
  username: config.environment.DATABASE_USERNAME,
  password: config.environment.DATABASE_PASSWORD,
  database: config.environment.DATABASE_NAME,
});

log.info("Connecting to database and synchronizing schema...");

const database = new denodb.Database(connection);

database.link([ConfigItem]);

while (true) {
  try {
    await database.sync({ drop: true });
    break;
  } catch {
    log.info("Waiting for database...");
    await async.delay(2000);
  }
}

log.info("Database setup complete.");

export default database;
