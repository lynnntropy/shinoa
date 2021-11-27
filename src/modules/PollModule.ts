import { Poll, Vote } from ".prisma/client";
import { bold, hyperlink, inlineCode, userMention } from "@discordjs/builders";
import { logger } from "@sentry/utils";
import {
  GuildChannel,
  MessageActionRow,
  MessageEmbed,
  MessageOptions,
  MessageSelectMenu,
  MessageSelectOptionData,
  PermissionResolvable,
  TextChannel,
} from "discord.js";
import { Command, CommandSubCommand } from "../internal/command";
import { EventHandler, Module } from "../internal/types";
import prisma from "../prisma";

type PollOptions = MessageSelectOptionData[];
type PollResults = { [key: string]: number };

class PollCommand extends Command {
  name = "poll";
  description = "Manage polls.";
  requiredPermissions: PermissionResolvable = ["MANAGE_GUILD"];

  subCommands: CommandSubCommand[] = [
    {
      name: "show",
      description: "Show the results of a specific poll.",
      options: [
        {
          type: "STRING",
          name: "id",
          description: "The ID of the poll.",
          required: true,
        },
        {
          type: "BOOLEAN",
          name: "public",
          description:
            "Whether to show the results to *everyone* in the channel, instead of just to you.",
          required: false,
        },
        {
          type: "BOOLEAN",
          name: "sort",
          description: "Whether to sort the results by number of votes.",
          required: false,
        },
        {
          type: "BOOLEAN",
          name: "verbose",
          description:
            "Whether to show individual votes instead of just cumulative results.",
          required: false,
        },
      ],

      async handle(interaction) {
        const id = interaction.options.getString("id", true);
        const makePublic = interaction.options.getBoolean("public") ?? false;
        const sort = interaction.options.getBoolean("sort") ?? true;
        const verbose = interaction.options.getBoolean("verbose") ?? false;

        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Polls can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        const poll = await prisma.poll.findUnique({
          where: {
            guildId_localId: { guildId: interaction.guildId, localId: id },
          },
          include: {
            votes: true,
          },
        });
        if (poll === null) {
          await interaction.reply({
            content: "There's no poll with that ID.",
            ephemeral: true,
          });
          return;
        }

        const embed = buildPollResultsEmbed(poll, poll.votes, sort, verbose);

        await interaction.reply({ embeds: [embed], ephemeral: !makePublic });
      },
    },
    {
      name: "show-active",
      description: "Show all active polls, with the current results.",
      options: [
        {
          type: "BOOLEAN",
          name: "public",
          description:
            "Whether to show the results to *everyone* in the channel, instead of just to you.",
          required: false,
        },
        {
          type: "BOOLEAN",
          name: "sort",
          description: "Whether to sort the results by number of votes.",
          required: false,
        },
      ],

      async handle(interaction) {
        const makePublic = interaction.options.getBoolean("public") ?? false;
        const sort = interaction.options.getBoolean("sort") ?? true;

        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Polls can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        const polls = await prisma.poll.findMany({
          where: {
            guildId: interaction.guildId,
            active: true,
          },
          include: {
            votes: true,
          },
        });

        if (polls.length === 0) {
          await interaction.reply({
            content: "There currently aren't any active polls.",
            ephemeral: !makePublic,
          });
          return;
        }

        const embeds = polls.map((p) =>
          buildPollResultsEmbed(p, p.votes, sort, false)
        );

        await interaction.reply({ embeds, ephemeral: !makePublic });
      },
    },
    {
      name: "new",
      description: "Create a new poll.",
      options: [
        {
          type: "STRING",
          name: "id",
          description: "A unique ID for the poll, e.g. 'art-contest-dec-2021'.",
          required: true,
        },
        {
          type: "STRING",
          name: "name",
          description:
            "A display name for the poll, e.g. 'December 2021 Art Contest'.",
          required: true,
        },
        {
          type: "CHANNEL",
          name: "channel",
          description: "The channel you want the poll to take place in.",
          required: true,
        },
        {
          type: "STRING",
          name: "options",
          description: `A JSON array with the shape Array<{ label: string, value: string, description?: string }>.`,
          required: true,
        },
      ],

      async handle(interaction) {
        const id = interaction.options.getString("id", true);
        const name = interaction.options.getString("name", true);
        const channel = interaction.options.getChannel(
          "channel",
          true
        ) as GuildChannel;
        const rawOptions = interaction.options.getString("options", true);

        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Polls can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        if (!channel.isText()) {
          interaction.reply({
            content: `Channel must be a text channel.`,
            ephemeral: true,
          });
          return;
        }

        const existingPoll = await prisma.poll.findUnique({
          where: {
            guildId_localId: { guildId: interaction.guildId, localId: id },
          },
        });
        if (existingPoll !== null) {
          interaction.reply({
            content: `A poll with the ID \`${id}\` already exists.`,
            ephemeral: true,
          });
          return;
        }

        let options: MessageSelectOptionData[];

        try {
          options = JSON.parse(rawOptions);
        } catch (e) {
          if (e instanceof SyntaxError) {
            interaction.reply({
              content: `Syntax error in options: ${e.message}`,
              ephemeral: true,
            });
            return;
          }

          throw e;
        }

        const message = await channel.send(buildPollMessage(id, name, options));

        await prisma.poll.create({
          data: {
            guildId: channel.guildId,
            localId: id,
            name,
            channelId: channel.id,
            messsageId: message.id,
            options: options as any[],
          },
        });

        await interaction.reply({
          ephemeral: true,
          embeds: [
            {
              title: "Poll created!",
              description: `${hyperlink("Go to poll", message.url)}`,
            },
          ],
        });
      },
    },
    {
      name: "close",
      description: "Close an active poll.",
      options: [
        {
          type: "STRING",
          name: "id",
          description: "The ID of the poll.",
          required: true,
        },
      ],

      async handle(interaction) {
        const id = interaction.options.getString("id", true);

        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Polls can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        const poll = await prisma.poll.findUnique({
          where: {
            guildId_localId: { guildId: interaction.guildId, localId: id },
          },
        });
        if (poll === null) {
          await interaction.reply({
            content: "There's no poll with that ID.",
            ephemeral: true,
          });
          return;
        }

        if (!poll.active) {
          await interaction.reply({
            content: `Poll ${bold(poll.name)} is already closed.`,
            ephemeral: true,
          });
          return;
        }

        await prisma.poll.update({
          where: { id: poll.id },
          data: { active: false },
        });

        const embed = new MessageEmbed()
          .setTitle(`Poll: ${bold(poll.name)}`)
          .setDescription("This poll has been closed.")
          .setFooter(`Poll ID: ${poll.localId}`);

        const channel = (await interaction.guild?.channels.fetch(
          poll.channelId
        )) as TextChannel;
        const message = await channel.messages.fetch(poll.messsageId);
        await message.edit({
          embeds: [embed],
          components: [],
        });

        await interaction.reply({
          content: `Poll ${bold(poll.name)} successfully closed.`,
        });
      },
    },
    {
      name: "reopen",
      description: "Reopen a previously closed poll.",
      options: [
        {
          type: "STRING",
          name: "id",
          description: "The ID of the poll.",
          required: true,
        },
      ],

      async handle(interaction) {
        const id = interaction.options.getString("id", true);

        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Polls can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        const poll = await prisma.poll.findUnique({
          where: {
            guildId_localId: { guildId: interaction.guildId, localId: id },
          },
        });
        if (poll === null) {
          await interaction.reply({
            content: "There's no poll with that ID.",
            ephemeral: true,
          });
          return;
        }

        if (poll.active) {
          await interaction.reply({
            content: `Poll ${bold(poll.name)} is already open.`,
            ephemeral: true,
          });
          return;
        }

        await prisma.poll.update({
          where: { id: poll.id },
          data: { active: true },
        });

        const channel = (await interaction.guild?.channels.fetch(
          poll.channelId
        )) as TextChannel;
        const message = await channel.messages.fetch(poll.messsageId);
        await message.edit(
          buildPollMessage(
            poll.localId,
            poll.name,
            poll.options as unknown as MessageSelectOptionData[]
          )
        );

        await interaction.reply({
          content: `Poll ${bold(poll.name)} successfully reopened.`,
        });
      },
    },
  ];
}

const handleInteractionCreate: EventHandler<"interactionCreate"> = async (
  interaction
) => {
  if (!interaction.inGuild()) {
    return;
  }

  if (!interaction.isSelectMenu()) {
    return;
  }

  const message = await prisma.poll.findUnique({
    where: {
      messsageId: interaction.message.id,
    },
  });

  if (message === null) {
    // This interaction isn't for a known poll message
    return;
  }

  const poll = await prisma.poll.findUnique({
    where: {
      guildId_localId: {
        guildId: interaction.guildId,
        localId: interaction.customId,
      },
    },
  });

  if (poll === null) {
    throw Error(
      `Poll SelectMenuInteraction references unknown poll ID ${interaction.customId} in guild ID ${interaction.guildId}.`
    );
  }

  if (!poll.active) {
    throw Error(
      `Poll SelectMenuInteraction references inactive poll ID ${interaction.customId} in guild ID ${interaction.guildId}.`
    );
  }

  const existingVote = await prisma.vote.findUnique({
    where: {
      pollId_userId: {
        pollId: poll.id,
        userId: interaction.user.id,
      },
    },
  });

  if (existingVote !== null) {
    await interaction.reply({
      content: "Sorry, you've already voted in this poll.",
      ephemeral: true,
    });
    return;
  }

  if (interaction.values.length !== 1) {
    throw Error(
      `Poll SelectMenuInteraction somehow has fewer or more than one value: ` +
        `\`${JSON.stringify(interaction.values)}\``
    );
  }

  await prisma.vote.create({
    data: {
      pollId: poll.id,
      userId: interaction.user.id,
      value: interaction.values[0],
    },
  });

  await interaction.reply({
    content: "Your vote has been cast successfully!",
    ephemeral: true,
  });
};

const buildPollMessage = (
  localId: string,
  name: string,
  options: MessageSelectOptionData[]
): MessageOptions => {
  const actionRow = new MessageActionRow().addComponents(
    new MessageSelectMenu()
      .setCustomId(localId)
      .setPlaceholder("Select an option to cast your vote.")
      .addOptions(options)
  );

  const embed = new MessageEmbed()
    .setTitle(`Poll: ${bold(name)}`)
    .setFooter(`Poll ID: ${localId}`);

  const message: MessageOptions = {
    embeds: [embed],
    components: [actionRow],
  };

  return message;
};

const buildPollResultsEmbed = (
  poll: Poll,
  votes: Vote[],
  sort: boolean = true,
  verbose: boolean = false
): MessageEmbed => {
  const options = poll.options as unknown as PollOptions;
  const results: PollResults = {};

  if (verbose) {
    const embed = new MessageEmbed()
      .setTitle(`Poll Responses: ${poll.name}`)
      .setDescription(
        votes
          .map((vote) => {
            return (
              `${userMention(vote.userId)}: ` +
              (options.find((o) => o.value === vote.value)?.label ??
                inlineCode(vote.value))
            );
          })
          .join("\n")
      )
      .setFooter(`Poll ID: ${poll.localId}`);

    return embed;
  }

  for (const option of options) {
    results[option.value] = 0;
  }

  for (const vote of votes) {
    if (!(vote.value in results)) {
      logger.error(`Vote ID ${vote.id} has invalid value '${vote.value}'.`);
      continue;
    }

    results[vote.value]++;
  }

  let keys = Object.keys(results);
  if (sort) {
    keys = keys.sort((a, b) => results[b] - results[a]);
  }

  const embed = new MessageEmbed()
    .setTitle(`Poll Results: ${poll.name}`)
    .setDescription(
      keys
        .map((key) => {
          const label = options.find((o) => o.value === key)!.label;
          const result = results[key];

          return `${label}: ${bold(result.toString())} votes`;
        })
        .join("\n")
    )
    .setFooter(`Poll ID: ${poll.localId}`);

  return embed;
};

const PollModule: Module = {
  commands: [new PollCommand()],
  handlers: {
    interactionCreate: [handleInteractionCreate],
  },
};

export default PollModule;
