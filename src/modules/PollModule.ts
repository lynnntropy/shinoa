import { Poll } from ".prisma/client";
import { bold, hyperlink } from "@discordjs/builders";
import {
  GuildChannel,
  MessageActionRow,
  MessageOptions,
  MessageSelectMenu,
  MessageSelectOptionData,
  PermissionResolvable,
  TextChannel,
} from "discord.js";
import { Command, CommandSubCommand } from "../internal/command";
import { Module } from "../internal/types";
import prisma from "../prisma";

class PollCommand extends Command {
  name = "poll";
  description = "Manage polls.";
  requiredPermissions: PermissionResolvable = ["MANAGE_GUILD"];

  subCommands: CommandSubCommand[] = [
    {
      name: "show",
      description: "Show the results of a specific poll.",
      // TODO allow ephemeral to be configurable

      async handle(interaction) {},
    },
    {
      name: "show-active",
      description: "Show all active polls, with the current results.",
      // TODO allow ephemeral to be configurable

      async handle(interaction) {},
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

        const channel = (await interaction.guild?.channels.fetch(
          poll.channelId
        )) as TextChannel;
        const message = await channel.messages.fetch(poll.messsageId);
        await message.edit({
          content: `Poll ${bold(poll.name)} has been closed.`,
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

  const message: MessageOptions = {
    content: `Poll: ${bold(name)}`,
    components: [actionRow],
  };

  return message;
};

// TODO listen for incoming votes
// probably best to do this by remembering the message ID for each poll
// and then setting up a collector on that message?
// alternatively, we could just listen for interactions directly

const PollModule: Module = {
  commands: [new PollCommand()],
  handlers: {},
};

export default PollModule;
