import { CronJob } from "cron";
import { Guild, Snowflake } from "discord.js";
import client from "../client";
import config from "../config";
import { EventHandler, Module } from "../internal/types";
import appLogger from "../logger";

const logger = appLogger.child({ module: "MemberCounter" });

export interface MemberCounterConfig {
  enabled: true;
  channelId: Snowflake;
  buildChannelName?: (count: number) => string;
}

const defaultChannelNameBuilder = (count: number) => `Members: ${count}`;

const handleReady: EventHandler<"ready"> = () =>
  updateMemberCountsForAllGuilds();

const updateMemberCountsForAllGuilds = async () => {
  logger.debug(`\`updateMemberCountsForAllGuilds\` running.`);

  for (const [, guild] of client.guilds.cache) {
    updateMemberCount(guild);
  }
};

const updateMemberCount = async (guild: Guild) => {
  if (!config.guilds[guild.id]?.memberCounter?.enabled) {
    return;
  }

  const guildConfig = config.guilds[guild.id]?.memberCounter!;
  const channel = await client.channels.fetch(guildConfig.channelId);

  if (!channel?.isVoiceBased()) {
    logger.error(
      { channel },
      `Channel configured for guild ID ${guild.id} is not a voice channel.`
    );
    return;
  }

  guild = await guild.fetch();

  const builder = guildConfig.buildChannelName ?? defaultChannelNameBuilder;
  const channelName = builder(guild.memberCount);

  logger.debug(
    {
      channel,
      channelName,
    },
    `Setting channel name: '${channel.name}' -> '${channelName}'.`
  );
  await channel.setName(
    channelName,
    `channel name set by MemberCounterModule.`
  );
};

const MemberCounterModule: Module = {
  commands: [],
  handlers: {
    ready: [handleReady],
  },
  cronJobs: [new CronJob("0 */15 * * * *", updateMemberCountsForAllGuilds)],
};

export default MemberCounterModule;
