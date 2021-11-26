import { bold, hyperlink } from "@discordjs/builders";
import {
  GuildChannel,
  MessageActionRow,
  MessageSelectMenu,
  MessageSelectOptionData,
  PermissionResolvable,
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

        if (!channel.isText()) {
          interaction.reply({
            content: `Channel must be a text channel.`,
            ephemeral: true,
          });
          return;
        }

        const existingPoll = await prisma.poll.findUnique({ where: { id } });
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

        const actionRow = new MessageActionRow().addComponents(
          new MessageSelectMenu()
            .setCustomId(id)
            .setPlaceholder("Select an option to cast your vote.")
            .addOptions(options)
        );

        const message = await channel.send({
          content: `Poll: ${bold(name)}`,
          components: [actionRow],
        });

        await prisma.poll.create({
          data: {
            id,
            guildId: channel.guildId,
            channelId: channel.id,
            messsageId: message.id,
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

      async handle(interaction) {},
    },
    {
      name: "reopen",
      description: "Reopen a previously closed poll.",

      async handle(interaction) {},
    },
  ];
}

// TODO listen for incoming votes
// probably best to do this by remembering the message ID for each poll
// and then setting up a collector on that message?
// alternatively, we could just listen for interactions directly

const PollModule: Module = {
  commands: [new PollCommand()],
  handlers: {},
};

export default PollModule;
