import { Client, Intents } from "discord.js";
import handlers from "./eventHandlers";

const client = new Client({
  intents: [Intents.ALL],
});

for (const event in handlers) {
  for (const handler of handlers[event]) {
    client.on(event, handler);
  }
}

export default client;
