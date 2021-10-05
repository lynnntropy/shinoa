import { Client, ClientEvents, Intents } from "discord.js";
import handlers from "./eventHandlers";

const client = new Client({
  intents: [
    Intents.FLAGS.GUILDS,
    Intents.FLAGS.GUILD_MEMBERS,
    Intents.FLAGS.GUILD_BANS,
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.DIRECT_MESSAGES,
    Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
    Intents.FLAGS.GUILD_VOICE_STATES,
  ],
  partials: ["USER"],
});

for (const event in handlers) {
  for (const handler of handlers[event]) {
    client.on(event as keyof ClientEvents, handler);
  }
}

export default client;
