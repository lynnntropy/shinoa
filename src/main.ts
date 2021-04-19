import { discordeno, log } from "../deps.ts";

const token = Deno.env.get("TOKEN");
if (!token) {
  log.error("TOKEN variable is required.");
  Deno.exit(1);
}

discordeno.startBot({
  token,
  intents: ["GUILDS", "GUILD_MESSAGES"],
  eventHandlers: {
    ready: () => console.log("Connected to Discord gateway!"),
  },
});
