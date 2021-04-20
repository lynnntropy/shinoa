import { denodb, log, async } from "../../deps.ts";
import ConfigItem from "./models/ConfigItem.ts";

const connection = new denodb.PostgresConnector({
  host: Deno.env.get("DATABASE_HOST") ?? "db",
  username: Deno.env.get("DATABASE_USERNAME") ?? "postgres",
  password: Deno.env.get("DATABASE_PASSWORD") ?? "postgres",
  database: Deno.env.get("DATABASE_NAME") ?? "shinoa",
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
