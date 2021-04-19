import { discordeno, log } from "../deps.ts";
import config from "./config.ts";
import { logInteraction, logMessage } from "./util/log.ts";

const token = Deno.env.get("TOKEN");
if (!token) {
  log.error("TOKEN variable is required.");
  Deno.exit(1);
}

const onReady = async () => {
  log.info("Connected to Discord gateway!");

  log.info("Synchronizing global commands...");

  const existingCommands = await discordeno.getSlashCommands();
  for (const command of existingCommands) {
    if (
      config.globalCommands.find((c) => c.name === command.name) === undefined
    ) {
      await discordeno.deleteSlashCommand(command.id);
    }
  }

  for (const command of config.globalCommands) {
    await discordeno.createSlashCommand({
      name: command.name,
      description: command.description,
      options: command.options,
    });
    log.debug(`synced ${command.name}`);
  }

  for (const guildId in config.guilds) {
    const guild = discordeno.cache.guilds.get(guildId);
    const guildConfig = config.guilds[guildId];

    if (guildConfig.commands) {
      log.info(`Synchronizing commands for guild ${guild?.name}...`);

      for (const command of guildConfig.commands) {
        await discordeno.createSlashCommand({
          name: command.name,
          description: command.description,
          options: command.options,
          guildID: guildId,
        });
        log.debug(`synced ${command.name}`);
      }
    }
  }

  log.info("Initialization complete!");
};

discordeno.startBot({
  token,
  intents: ["GUILDS", "GUILD_MESSAGES"],
  eventHandlers: {
    ready: onReady,
    interactionCreate: (data) => {
      logInteraction(data);

      for (const command of config.guilds[data.guild_id].commands ?? []) {
        if (command.name === data.data?.name) {
          command.process(data);
          return;
        }
      }

      for (const command of config.globalCommands) {
        if (command.name === data.data?.name) {
          command.process(data);
          return;
        }
      }
    },
    messageCreate: (data) => logMessage(data),
  },
});
