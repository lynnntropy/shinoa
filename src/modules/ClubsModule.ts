import { bold, channelMention, userMention } from "@discordjs/builders";
import { Club } from "@prisma/client";
import { CronJob } from "cron";
import {
  PermissionResolvable,
  Snowflake,
  MessageOptions,
  Message,
  PartialMessage,
} from "discord.js";
import client from "../client";
import config from "../config";
import { Command, CommandSubCommand } from "../internal/command";
import { EventHandler, Module } from "../internal/types";
import appLogger from "../logger";
import prisma from "../prisma";

// todo handle unexpected states like club channels getting deleted

const logger = appLogger.child({ module: "ClubsModule" });

const UPVOTE_EMOJI = "⬆️";
const DEFAULT_VOTES_REQUIRED = 5;

export type GuildClubsConfig = {
  enabled: true;
  channelId: string;
  defaultVotesRequired?: number;
};

class ClubsCommand extends Command {
  name = "clubs";
  description = "Manage clubs.";
  requiredPermissions: PermissionResolvable = ["MANAGE_CHANNELS"];

  subCommands: CommandSubCommand[] = [
    {
      name: "create",
      description: "Create a club.",
      options: [
        {
          name: "name",
          type: "STRING",
          description: "The club name.",
          required: true,
        },
      ],

      async handle(interaction) {
        if (!interaction.inGuild()) {
          await interaction.reply({
            content: `Clubs can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        try {
          assertClubsEnabledForGuild(interaction.guildId);
        } catch {
          await interaction.reply({
            content: `Clubs aren't enabled for this server.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.deferReply();

        const name = interaction.options.getString(`name`, true);

        const channel = await createClubChannel(interaction.guildId, name);

        const club = await prisma.club.create({
          data: {
            guildId: interaction.guildId,
            channelId: channel.id,
          },
        });

        await syncClubToGuild(club);
        await syncClubIndexChannelForGuild(interaction.guildId);

        await interaction.editReply({
          content: `Created club ${channelMention(channel.id)}.`,
        });
      },
    },
    {
      name: "archive",
      description: "Archive a club.",
      options: [
        {
          name: "channel",
          type: "CHANNEL",
          description: "The club to archive.",
          required: true,
        },
      ],

      async handle(interaction) {
        if (!interaction.inGuild()) {
          await interaction.reply({
            content: `Clubs can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        try {
          assertClubsEnabledForGuild(interaction.guildId);
        } catch {
          await interaction.reply({
            content: `Clubs aren't enabled for this server.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.deferReply();

        const channel = interaction.options.getChannel(`channel`, true);

        const club = await prisma.club.findFirst({
          where: {
            guildId: interaction.guildId,
            channelId: channel.id,
          },
        });

        if (!club) {
          await interaction.reply({
            content: `Club not found.`,
            ephemeral: true,
          });
          return;
        }

        if (club.archived) {
          await interaction.reply({
            content: `This club is already archived.`,
            ephemeral: true,
          });
          return;
        }

        const updatedClub = await prisma.club.update({
          where: { id: club.id },
          data: {
            archived: true,
          },
        });

        await syncClubToGuild(updatedClub);
        await syncClubIndexChannelForGuild(interaction.guildId);

        await interaction.editReply({
          content: `Club successfully archived.`,
        });
      },
    },
    {
      name: "unarchive",
      description: "Unarchive an archived club.",
      options: [
        {
          name: "channel",
          type: "CHANNEL",
          description: "The club to unarchive.",
          required: true,
        },
      ],

      async handle(interaction) {
        if (!interaction.inGuild()) {
          await interaction.reply({
            content: `Clubs can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        try {
          assertClubsEnabledForGuild(interaction.guildId);
        } catch {
          await interaction.reply({
            content: `Clubs aren't enabled for this server.`,
            ephemeral: true,
          });
          return;
        }

        await interaction.deferReply();

        const channel = interaction.options.getChannel(`channel`, true);

        const club = await prisma.club.findFirst({
          where: {
            guildId: interaction.guildId,
            channelId: channel.id,
          },
        });

        if (!club) {
          await interaction.reply({
            content: `Club not found.`,
            ephemeral: true,
          });
          return;
        }

        if (!club.archived) {
          await interaction.reply({
            content: `This club isn't archived.`,
            ephemeral: true,
          });
          return;
        }

        const updatedClub = await prisma.club.update({
          where: { id: club.id },
          data: {
            archived: false,
          },
        });

        await syncClubToGuild(updatedClub);
        await syncClubIndexChannelForGuild(interaction.guildId);

        await interaction.editReply({
          content: `Club successfully unarchived.`,
        });
      },
    },
    {
      name: "create-vote",
      description: "Create a vote for a new club.",
      options: [
        {
          name: "club-name",
          type: "STRING",
          description: "The name of the club.",
          required: true,
        },
        {
          name: "votes-required",
          type: "INTEGER",
          description:
            "The votes required for the vote to pass (if different from the server default).",
        },
      ],

      async handle(interaction) {
        if (!interaction.inGuild()) {
          await interaction.reply({
            content: `Clubs can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        try {
          assertClubsEnabledForGuild(interaction.guildId);
        } catch {
          await interaction.reply({
            content: `Clubs aren't enabled for this server.`,
            ephemeral: true,
          });
          return;
        }

        const guildConfig = config.guilds[interaction.guildId].clubs!;

        const clubName = interaction.options.getString(`club-name`, true);
        const votesRequired = interaction.options.getInteger(`votes-required`);

        const displayVotesRequired =
          interaction.options.getInteger(`votes-required`) ??
          guildConfig.defaultVotesRequired ??
          DEFAULT_VOTES_REQUIRED;

        const message = await interaction.channel!.send({
          content:
            `Vote to get a new club!\n\n` +
            `Club name: ${bold(clubName)}\n` +
            `Votes required: ${bold(displayVotesRequired.toString(10))}`,
        });

        await message.react(UPVOTE_EMOJI);

        await prisma.clubVote.create({
          data: {
            guildId: interaction.guildId,
            channelId: message.channelId,
            messageId: message.id,
            clubName,
            votesRequired,
          },
        });

        await interaction.reply({
          content: `Vote created!`,
          ephemeral: true,
        });
      },
    },
  ];
}

const handleReady: EventHandler<"ready"> = async () => {
  await syncClubsForAllGuilds();
};

const handleMessageReactionAdd: EventHandler<"messageReactionAdd"> = async (
  reaction
) => handleVoteMessageUpdate(reaction.message);
const handleMessageReactionRemove: EventHandler<
  "messageReactionRemove"
> = async (reaction) => handleVoteMessageUpdate(reaction.message);
const handleMessageReactionRemoveEmoji: EventHandler<
  "messageReactionRemoveEmoji"
> = async (reaction) => handleVoteMessageUpdate(reaction.message);
const handleMessageReactionRemoveAll: EventHandler<
  "messageReactionRemoveAll"
> = async (message) => handleVoteMessageUpdate(message);

const handleVoteMessageUpdate = async (message: Message | PartialMessage) => {
  if (!message.guildId) return;

  const guildId = message.guildId;

  if (!config.guilds[guildId].clubs?.enabled) return;

  const vote = await prisma.clubVote.findFirst({
    where: {
      guildId: message.guildId,
      channelId: message.channelId,
      messageId: message.id,
    },
  });

  if (!vote) {
    return;
  }

  if (message.partial) {
    message = await message.fetch();
  }

  const guildConfig = config.guilds[message.guildId!].clubs!;

  logger.debug({ message }, `Reactions changed for vote message.`);

  const users = await message.reactions.resolve(UPVOTE_EMOJI)?.users.fetch();
  const voteCount = users?.filter((u) => u.id !== client.user?.id)?.size ?? 0;

  const requiredVoteCount =
    vote.votesRequired ??
    guildConfig.defaultVotesRequired ??
    DEFAULT_VOTES_REQUIRED;

  if (voteCount >= requiredVoteCount) {
    logger.info(
      { vote },
      `Creating club "${vote.clubName}" based on a successful vote!`
    );

    // club has successfully been voted in!

    // create the club

    const clubChannel = await createClubChannel(
      message.guildId!,
      vote.clubName
    );

    const club = await prisma.club.create({
      data: {
        guildId: message.guildId!,
        channelId: clubChannel.id,
      },
    });

    await syncClubToGuild(club);
    await syncClubIndexChannelForGuild(message.guildId!);

    // delete the vote message
    await message.delete();

    // delete the vote
    await prisma.clubVote.delete({ where: { id: vote.id } });

    // ping people who voted in the new club
    await clubChannel.send({
      content:
        `Welcome to your new club!\n\n` +
        users
          ?.filter((u) => u.id !== client.user?.id)
          .map((u) => userMention(u.id))
          .join(` `),
    });

    // send an update message in the vote message's channel
    await message.channel.send(
      `The club ${channelMention(
        clubChannel.id
      )} has been successully voted in!`
    );
  }
};

const syncClubsForAllGuilds = async () => {
  logger.debug(`Synchronizing clubs for all guilds.`);

  const guildIdsToSync: Snowflake[] = [];

  for (const guildId in config.guilds) {
    if (config.guilds[guildId].clubs?.enabled) {
      guildIdsToSync.push(guildId);
    }
  }

  await Promise.all(guildIdsToSync.map(syncAllClubsForGuild));

  logger.debug(`Finished synchronizing clubs for all guilds.`);
};

const syncAllClubsForGuild = async (guildId: Snowflake) => {
  logger.debug(`Synchronizing clubs for guild ID ${guildId}.`);

  const clubs = await prisma.club.findMany({
    where: { guildId },
  });

  await Promise.all(clubs.map(syncClubToGuild));
  await syncClubIndexChannelForGuild(guildId);

  logger.debug(`Finished synchronizing clubs for guild ID ${guildId}.`);
};

const assertClubsEnabledForGuild = (guildId: Snowflake) => {
  if (config.guilds[guildId].clubs?.enabled) {
    return;
  }

  throw Error("Clubs aren't enabled for this guild.");
};

const createClubChannel = async (guildId: string, channelName: string) => {
  assertClubsEnabledForGuild(guildId);

  const guildConfig = config.guilds[guildId].clubs!;
  const guild = await client.guilds.fetch(guildId);

  const parentChannel = await guild.channels.fetch(guildConfig.channelId);

  if (!parentChannel) {
    throw Error("Club parent channel for guild not found.");
  }

  if (!parentChannel.isText()) {
    throw Error("Club parent channel must be a text channel.");
  }

  const channel = await parentChannel.threads.create({
    name: channelName,
    autoArchiveDuration: "MAX",
    reason: `Automatically created thread for club.`,
  });

  return channel;
};

const syncClubToGuild = async (club: Club) => {
  const clubChannel = await findClubChannel(club);

  if (!clubChannel) {
    throw Error("Club channel not found.");
  }

  if (clubChannel.archived !== club.archived) {
    clubChannel.setArchived(
      club.archived,
      `Automatically synced thread with club.`
    );
  }
};

const findClubChannel = async (club: Club) => {
  assertClubsEnabledForGuild(club.guildId);

  const guildConfig = config.guilds[club.guildId].clubs!;

  const guild = await client.guilds.fetch(club.guildId);
  const parentChannel = await guild.channels.fetch(guildConfig.channelId);

  if (!parentChannel) {
    throw Error("Club parent channel for guild not found.");
  }

  if (!parentChannel.isText()) {
    throw Error("Club parent channel must be a text channel.");
  }

  const channel = await parentChannel.threads.fetch(club.channelId);

  if (!channel) {
    return null;
  }

  return channel;
};

const buildClubIndexMessage = async (guildId: Snowflake) => {
  assertClubsEnabledForGuild(guildId);

  let content = `Clubs are discoverable threads that don't get auto-archived.\n\nActive clubs you can join:\n\n`;

  const activeClubs = await prisma.club.findMany({
    where: { guildId, archived: false },
  });

  for (const club of activeClubs) {
    const channel = await findClubChannel(club);

    if (!channel) {
      throw Error("Failed to find channel for club.");
    }

    content +=
      `${channelMention(channel.id)} (${channel.memberCount} members)` + "\n";
  }

  const message: Pick<MessageOptions, "content"> = {
    content,
  };

  return message;
};

const syncClubIndexChannelForGuild = async (guildId: Snowflake) => {
  assertClubsEnabledForGuild(guildId);
  const guildConfig = config.guilds[guildId].clubs!;

  const guild = await client.guilds.fetch(guildId);
  const channel = await guild.channels.fetch(guildConfig.channelId);

  if (!channel) {
    throw Error("Failed to find club index channel for guild.");
  }

  if (!channel.isText()) {
    throw Error("Club index channel must be a text channel.");
  }

  const messages = await channel.messages.fetch({ limit: 10 });

  // clean up stuff like "thread created" messages and other people's messages

  await Promise.all(
    messages
      .filter((m) => m.type !== "DEFAULT" || m.author.id !== client.user?.id)
      .map((m) => m.delete())
  );

  // create or update the index message

  const indexMessage = messages.find(
    (m) => m.type === "DEFAULT" && m.author.id === client.user?.id
  );

  if (!indexMessage) {
    await channel.send(await buildClubIndexMessage(guildId));
    return;
  }

  await indexMessage.edit(await buildClubIndexMessage(guildId));
};

const ClubsModule: Module = {
  commands: [new ClubsCommand()],
  handlers: {
    ready: [handleReady],
    messageReactionAdd: [handleMessageReactionAdd],
    messageReactionRemove: [handleMessageReactionRemove],
    messageReactionRemoveEmoji: [handleMessageReactionRemoveEmoji],
    messageReactionRemoveAll: [handleMessageReactionRemoveAll],
  },
  cronJobs: [new CronJob("0 */5 * * * *", syncClubsForAllGuilds)],
};

export default ClubsModule;
