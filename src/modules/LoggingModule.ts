import {
  GuildChannelResolvable,
  Message,
  // MessageEmbed,
  PermissionResolvable,
  TextChannel,
  Guild,
  Role,
  ApplicationCommandOptionType,
  EmbedBuilder,
  Colors,
} from "discord.js";
import client from "../client";
import config from "../config";
import { EventHandler, Module } from "../internal/types";
import logger from "../logger";
import { detailedDiff } from "deep-object-diff";
import { isEmpty, pick } from "lodash";
import { LogEvent, ModerationEvent, ModerationEventType } from "../emitter";
import { Command, CommandSubCommand } from "../internal/command";
import { getKeyValueItem, setKeyValueItem } from "../keyValueStore";
import { formatDate } from "../utils/date";
import { buildUsernameString } from "../utils/strings";

const defaultChannels = {
  moderation: "mod-logs",
  messages: "message-logs",
  voice: "voice-logs",
  joins: "join-logs",
  userUpdates: "user-logs",
  keywords: "keyword-logs",
};

class KeywordsCommand extends Command {
  name = "keywords";
  description = "Configures keywords for this server.";
  requiredPermissions: PermissionResolvable = ["ManageGuild"];

  subCommands: CommandSubCommand[] = [
    {
      name: "list",
      description: "List the current keywords.",

      async handle(interaction) {
        const keywords = await getKeyValueItem<string[]>(
          `guilds.${interaction.guildId}.logging.keywords`
        );

        if (keywords === null || keywords.length === 0) {
          await setKeyValueItem(
            `guilds.${interaction.guildId}.logging.keywords`,
            []
          );

          await interaction.reply({
            content: "No keywords currently configured for this server.",
          });

          return;
        }

        let replyContent = "";
        replyContent += "Keywords currently configured for this server:\n\n";

        for (const keyword of keywords) {
          replyContent += `${keyword}\n`;
        }

        await interaction.reply({
          content: replyContent,
        });
      },
    },
    {
      name: "add",
      description: "Adds a keyword.",
      options: [
        {
          type: ApplicationCommandOptionType.String,
          description: "The keyword you want to add.",
          name: "keyword",
          required: true,
        },
      ],

      async handle(interaction) {
        let keywords =
          (await getKeyValueItem<string[]>(
            `guilds.${interaction.guildId}.logging.keywords`
          )) ?? [];

        const newKeyword = interaction.options.getString("keyword", true);

        keywords = [...keywords, newKeyword];
        keywords = [...new Set(keywords)];

        await setKeyValueItem(
          `guilds.${interaction.guildId}.logging.keywords`,
          keywords
        );

        await interaction.reply({
          content: `Added \`${newKeyword}\` to this server's keywords.`,
        });
      },
    },
    {
      name: "remove",
      description: "Removes a keyword.",
      options: [
        {
          type: ApplicationCommandOptionType.String,
          description: "The keyword you want to remove.",
          name: "keyword",
          required: true,
        },
      ],

      async handle(interaction) {
        let keywords = await getKeyValueItem<string[]>(
          `guilds.${interaction.guildId}.logging.keywords`
        );

        if (keywords === null || keywords.length === 0) {
          await interaction.reply({
            content: `This server doesn't have any keywords configured.`,
          });

          return;
        }

        const toRemove = interaction.options.getString("keyword", true).trim();

        keywords = keywords.filter(
          (k) => k.trim().toLowerCase() !== toRemove.toLowerCase()
        );

        await setKeyValueItem(
          `guilds.${interaction.guildId}.logging.keywords`,
          keywords
        );

        await interaction.reply({
          content: `Removed \`${toRemove}\` from this server's keywords.`,
        });
      },
    },
  ];
}

const handleReady: EventHandler<"ready"> = async () => {
  logger.info("Booting up logging module...");

  for (const guildId in config.guilds) {
    const guildConfig = config.guilds[guildId];
    const guild = client.guilds.resolve(guildId);

    if (!guildConfig.logging) {
      continue;
    }

    logger.debug(`Initializing logging channels for guild ${guild!.name}...`);

    // If we have a category ID, we'll look for
    // the channels from `defaultChannels` there
    if (guildConfig.logging.categoryId) {
      // Check if the category contains the right channels and
      // create them if not
      for (const key in defaultChannels) {
        const channelName: string =
          defaultChannels[key as keyof typeof defaultChannels];

        guild!.channels.cache.find(
          (c) =>
            c.parentId === guildConfig.logging?.categoryId &&
            c.name === channelName
        ) ??
          (await guild!.channels.create({
            name: channelName,
            parent: guildConfig.logging.categoryId,
          }));
      }

      return;
    }
  }
};

const handleMessageCreate: EventHandler<"messageCreate"> = async (message) => {
  if (!getLoggingConfigForGuild(message.guildId!)) {
    return;
  }

  if (message.author.bot) {
    return;
  }

  checkForKeywords(message);
};

const handleMessageUpdate: EventHandler<"messageUpdate"> = async (
  oldMessage,
  newMessage
) => {
  if (!getLoggingConfigForGuild(newMessage.guildId!)) {
    return;
  }

  if (oldMessage.partial) {
    oldMessage = await oldMessage.fetch();
  }

  if (newMessage.partial) {
    newMessage = await newMessage.fetch();
  }

  if (newMessage.author.bot) {
    return;
  }

  // We're only interested in messages that were actually edited
  if (oldMessage.content === newMessage.content) {
    return;
  }

  checkForKeywords(newMessage);

  const loggingChannel = getLoggingChannel(newMessage.guildId!, "messages");

  const embed = new EmbedBuilder()
    .setColor(Colors.Yellow)
    .setTitle(`${buildUsernameString(newMessage.author)} edited their message`)
    .addFields(
      { name: "Before", value: oldMessage.cleanContent },
      { name: "After", value: newMessage.cleanContent }
    )
    .setURL(newMessage.url);

  loggingChannel.send({ embeds: [embed] });
};

const handleMessageDelete: EventHandler<"messageDelete"> = async (message) => {
  if (!getLoggingConfigForGuild(message.guildId!)) {
    return;
  }

  if (message.author?.bot) {
    return;
  }

  const loggingChannel = getLoggingChannel(message.guildId!, "messages");

  const embed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setTitle(`${buildUsernameString(message.author)}'s message was deleted`)
    .setDescription(message.cleanContent ?? "(empty message)");

  const attachments = [...message.attachments.values()];

  if (
    attachments.length > 0 &&
    attachments.some((a) => a.contentType?.startsWith("image") ?? false)
  ) {
    const firstImageAttachment = attachments.find(
      (a) => a.contentType?.startsWith("image") ?? false
    );

    if (firstImageAttachment) {
      embed.setImage(firstImageAttachment.url);
    }
  }

  await loggingChannel.send({ embeds: [embed] });
};

const handleVoiceStateUpdate: EventHandler<"voiceStateUpdate"> = async (
  oldState,
  newState
) => {
  if (!getLoggingConfigForGuild(newState.guild.id)) {
    return;
  }

  // We're only interested in channel changes
  if (oldState.channelId === newState.channelId) {
    return;
  }

  const loggingChannel = getLoggingChannel(newState.guild.id, "voice");

  const joined = !!newState.channel;

  const embed = new EmbedBuilder().setAuthor({
    name: buildUsernameString(newState.member?.user ?? null),
    iconURL: newState.member?.user?.avatarURL() ?? undefined,
  });

  if (joined) {
    embed.setColor(Colors.Green);
    embed.setDescription(`Joined voice channel: **${newState.channel.name}**`);
  } else {
    embed.setColor(Colors.Red);
    embed.setDescription(`Left voice channel: **${oldState.channel?.name}**`);
  }

  await loggingChannel.send({ embeds: [embed] });
};

const handleGuildMemberAdd: EventHandler<"guildMemberAdd"> = async (member) => {
  if (!getLoggingConfigForGuild(member.guild.id)) {
    return;
  }

  const loggingChannel = getLoggingChannel(member.guild.id, "joins");

  const embed = new EmbedBuilder()
    .setColor(Colors.Green)
    .setAuthor({
      name: buildUsernameString(member.user),
      iconURL: member.user?.avatarURL() ?? undefined,
    })
    .setDescription(
      `
      Member joined.

      **ID:** ${member.user.id}
      **Username:** ${buildUsernameString(member.user)}
      **Account created:** ${formatDate(member.user.createdAt)}
      `.trim()
    );

  await loggingChannel.send({ embeds: [embed] });
};

const handleGuildMemberRemove: EventHandler<"guildMemberRemove"> = async (
  member
) => {
  if (!getLoggingConfigForGuild(member.guild.id)) {
    return;
  }

  const loggingChannel = getLoggingChannel(member.guild.id, "joins");

  const embed = new EmbedBuilder()
    .setColor(Colors.Red)
    .setAuthor({
      name: buildUsernameString(member.user),
      iconURL: member.user?.avatarURL() ?? undefined,
    })
    .setDescription(
      `
      Member left.

      **ID:** ${member.id}
      **Username:** ${member.user ? buildUsernameString(member.user) : "(?)"}
      **Account created:** ${
        member.user ? formatDate(member.user.createdAt) : "(?)"
      }
      `.trim()
    );

  await loggingChannel.send({ embeds: [embed] });
};

const handleGuildMemberUpdate: EventHandler<"guildMemberUpdate"> = async (
  oldMember,
  newMember
) => {
  if (oldMember.partial) {
    oldMember = await oldMember.fetch();
  }

  if (newMember.partial) {
    newMember = await newMember.fetch();
  }

  if (!getLoggingConfigForGuild(newMember.guild.id)) {
    return;
  }

  const loggingChannel = getLoggingChannel(newMember.guild.id, "userUpdates");

  const oldMemberStripped = pick(oldMember, ["nickname", "pending"]);
  const newMemberStripped = pick(newMember, ["nickname", "pending"]);

  const diff: any = detailedDiff(oldMemberStripped, newMemberStripped);

  const addedRoles: Role[] = [
    ...newMember.roles.cache
      .filter((r) => oldMember.roles.cache.get(r.id) === undefined)
      .values(),
  ];
  const removedRoles: Role[] = [
    ...oldMember.roles.cache
      .filter((r) => newMember.roles.cache.get(r.id) === undefined)
      .values(),
  ];

  if (
    isEmpty(diff.added) &&
    isEmpty(diff.deleted) &&
    isEmpty(diff.updated) &&
    isEmpty(addedRoles) &&
    isEmpty(removedRoles)
  ) {
    return;
  }

  let embedBody = ``;

  if (
    !isEmpty(diff.added) ||
    !isEmpty(diff.deleted) ||
    !isEmpty(diff.updated)
  ) {
    embedBody =
      `${embedBody}` +
      `\nOriginal data\n\`\`\`\n` +
      JSON.stringify(oldMemberStripped, undefined, 2) +
      `\n\`\`\``;
  }

  if (!isEmpty(diff.added)) {
    embedBody =
      `${embedBody}` +
      `\nProperties added\n\`\`\`\n` +
      JSON.stringify(diff.added, undefined, 2) +
      `\n\`\`\``;
  }

  if (!isEmpty(diff.deleted)) {
    embedBody =
      `${embedBody}` +
      `\nProperties deleted\n\`\`\`\n` +
      JSON.stringify(diff.deleted, undefined, 2) +
      `\n\`\`\``;
  }

  if (!isEmpty(diff.updated)) {
    embedBody =
      `${embedBody}` +
      `\nProperties updated\n\`\`\`\n` +
      JSON.stringify(diff.updated, undefined, 2) +
      `\n\`\`\``;
  }

  if (!isEmpty(addedRoles)) {
    embedBody =
      `${embedBody}` +
      `\nRole(s) added: ` +
      addedRoles.map((r) => `**${r.name}**`).join(", ");
  }

  if (!isEmpty(removedRoles)) {
    embedBody =
      `${embedBody}` +
      `\nRole(s) removed: ` +
      removedRoles.map((r) => `**${r.name}**`).join(", ");
  }

  embedBody = embedBody.trim();

  const embed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setAuthor({
      name: buildUsernameString(newMember.user),
      iconURL: newMember.user?.avatarURL() ?? undefined,
    })
    .setTitle("Member updated")
    .setDescription(embedBody);

  await loggingChannel.send({ embeds: [embed] });
};

const handleUserUpdate: EventHandler<"userUpdate"> = async (
  oldUser,
  newUser
) => {
  if (oldUser.partial) {
    oldUser = await oldUser.fetch();
  }

  if (newUser.partial) {
    newUser = await newUser.fetch();
  }

  const diff: any = detailedDiff(oldUser, newUser);

  if (isEmpty(diff.added) && isEmpty(diff.deleted) && isEmpty(diff.updated)) {
    return;
  }

  let embedBody = ``;

  embedBody =
    `${embedBody}` +
    `\nOriginal data\n\`\`\`\n` +
    JSON.stringify(oldUser, undefined, 2) +
    `\n\`\`\``;

  if (!isEmpty(diff.added)) {
    embedBody =
      `${embedBody}` +
      `\nProperties added\n\`\`\`\n` +
      JSON.stringify(diff.added, undefined, 2) +
      `\n\`\`\``;
  }

  if (!isEmpty(diff.deleted)) {
    embedBody =
      `${embedBody}` +
      `\nProperties deleted\n\`\`\`\n` +
      JSON.stringify(diff.deleted, undefined, 2) +
      `\n\`\`\``;
  }

  if (!isEmpty(diff.updated)) {
    embedBody =
      `${embedBody}` +
      `\nProperties updated\n\`\`\`\n` +
      JSON.stringify(diff.updated, undefined, 2) +
      `\n\`\`\``;
  }

  embedBody = embedBody.trim();

  const embed = new EmbedBuilder()
    .setColor(Colors.Blurple)
    .setAuthor({
      name: buildUsernameString(newUser),
      iconURL: newUser?.avatarURL() ?? undefined,
    })
    .setTitle("User updated")
    .setDescription(embedBody);

  if (diff.updated.avatar !== undefined && newUser.avatarURL() !== null) {
    embed.setImage(newUser.avatarURL() as string);
  }

  const guilds = (
    await Promise.all(
      client.guilds.cache.map(async (guild) => ({
        guildId: guild.id,
        member: await guild.members.fetch(newUser.id).catch(() => null),
      }))
    )
  )
    .filter((result) => result.member !== null)
    .map((result) => client.guilds.resolve(result.guildId) as Guild);

  for (const guild of guilds) {
    if (!getLoggingConfigForGuild(guild.id)) {
      continue;
    }

    await getLoggingChannel(guild.id, "userUpdates").send({ embeds: [embed] });
  }
};

const handleModerationEvent = async (event: ModerationEvent) => {
  const { guild } = event;

  if (!getLoggingConfigForGuild(guild.id)) {
    return;
  }

  const loggingChannel = getLoggingChannel(guild.id, "moderation");

  const embed = new EmbedBuilder();

  if (event.type === ModerationEventType.KICK) {
    embed.setTitle("Kicked");
  } else if (event.type === ModerationEventType.BAN) {
    embed.setTitle("Banned");
  } else if (event.type === ModerationEventType.UNBAN) {
    embed.setTitle("Unbanned");
  } else if (event.type === ModerationEventType.MUTE) {
    embed.setTitle("Muted");
  } else if (event.type === ModerationEventType.UNMUTE) {
    embed.setTitle("Unmuted");
  } else if (event.type === ModerationEventType.BLACKLIST) {
    embed.setTitle("Blacklisted");
  } else if (event.type === ModerationEventType.UNBLACKLIST) {
    embed.setTitle("Unblacklisted");
  } else if (event.type === ModerationEventType.DUNGEON) {
    embed.setTitle("Dungeoned");
  } else if (event.type === ModerationEventType.UNDUNGEON) {
    embed.setTitle("Undungeoned");
  }

  if (event.note) {
    embed.setDescription(event.note);
  }

  if (event.target) {
    embed.setAuthor({
      name: buildUsernameString(event.target.user),
      iconURL: event.target.user?.avatarURL() ?? undefined,
    });
  }

  if (event.moderator) {
    embed.addFields({
      name: "Moderator",
      value: buildUsernameString(event.moderator.user),
    });
  }

  if (event.reason) {
    embed.addFields({ name: "Reason", value: event.reason });
  }

  await loggingChannel.send({ embeds: [embed] });
};

const handleLogEvent = async (event: LogEvent) => {
  const { guild } = event;

  if (!getLoggingConfigForGuild(guild.id)) {
    return;
  }

  const loggingChannel = getLoggingChannel(guild.id, "keywords");

  const embed = new EmbedBuilder().setTitle("Event").setDescription(event.note);

  await loggingChannel.send({ embeds: [embed] });
};

const checkForKeywords = async (message: Message) => {
  const keywords = await getKeyValueItem<string[]>(
    `guilds.${message.guildId}.logging.keywords`
  );

  if (keywords === null || keywords.length === 0) {
    return;
  }

  const loggingChannel = getLoggingChannel(message.guildId!, "keywords");

  for (const keyword of keywords) {
    const regex = new RegExp(`\\b${keyword}\\b`, "gi");
    const matches = message.content.match(regex);

    if (matches !== null && matches.length > 0) {
      const embed = new EmbedBuilder()
        .setAuthor({
          name: buildUsernameString(message.author),
          iconURL: message.author.avatarURL() ?? undefined,
        })
        .setTitle("Found keyword in message")
        .setURL(message.url)
        .setDescription(message.cleanContent)
        .addFields({ name: "Keyword found", value: keyword });

      await loggingChannel.send({ embeds: [embed] });
    }
  }
};

const getLoggingConfigForGuild = (id: string) => config.guilds[id]?.logging;

const getLoggingChannel = (
  guildId: string,
  eventType: keyof typeof defaultChannels
): TextChannel => {
  const guildConfig = config.guilds[guildId];
  const guild = client.guilds.resolve(guildId);

  if (guildConfig.logging?.categoryId) {
    return getDefaultLoggingChannel(guildId, eventType);
  }

  if (guildConfig.logging?.channelIds?.[eventType] !== undefined) {
    return guild!.channels.resolve(
      guildConfig.logging?.channelIds![eventType] as GuildChannelResolvable
    ) as TextChannel;
  }

  throw Error(
    `No logging channel configured for event type '${eventType}' in guild ${
      guild!.name
    }.`
  );
};

const getDefaultLoggingChannel = (
  guildId: string,
  eventType: keyof typeof defaultChannels
): TextChannel => {
  const guildConfig = config.guilds[guildId];
  const guild = client.guilds.resolve(guildId);

  return guild!.channels.cache.find(
    (c) =>
      c.parentId === guildConfig.logging!.categoryId &&
      c.name === defaultChannels[eventType]
  ) as TextChannel;
};

const LoggingModule: Module = {
  commands: [new KeywordsCommand()],
  handlers: {
    ready: [handleReady],
    messageCreate: [handleMessageCreate],
    messageUpdate: [handleMessageUpdate],
    messageDelete: [handleMessageDelete],
    voiceStateUpdate: [handleVoiceStateUpdate],
    guildMemberAdd: [handleGuildMemberAdd],
    guildMemberRemove: [handleGuildMemberRemove],
    guildMemberUpdate: [handleGuildMemberUpdate],
    userUpdate: [handleUserUpdate],
  },
  appEventHandlers: [
    ["moderationEvent", handleModerationEvent],
    ["logEvent", handleLogEvent],
  ],
};

export default LoggingModule;
