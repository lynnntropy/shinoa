import { discordeno, log } from "../../../deps.ts";
import config from "../../config.ts";

const synchronizeCommands = async () => {
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

      const existingCommands = await discordeno.getSlashCommands(guildId);
      for (const command of existingCommands) {
        if (
          config.globalCommands.find((c) => c.name === command.name) ===
          undefined
        ) {
          await discordeno.deleteSlashCommand(command.id, guildId);
        }
      }

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
};

export default synchronizeCommands;
