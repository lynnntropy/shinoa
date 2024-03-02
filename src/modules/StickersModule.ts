import { hyperlink } from "@discordjs/builders";
import { Prisma, Sticker } from "@prisma/client";
import {
  APIEmbed,
  ApplicationCommandOptionType,
  GuildMember,
} from "discord.js";
import config from "../config";
import { Command, CommandSubCommand } from "../internal/command";
import { Module } from "../internal/types";
import prisma from "../prisma";
import { isValidHttpUrl } from "../utils/strings";

const TAG_PATTERN = /^([a-z]|[-_])+$/;

class StickersCommand extends Command {
  name = "stickers";
  description = "Stickers";

  subCommands: CommandSubCommand[] = [
    {
      name: "add",
      description: "Adds a sticker to the server.",
      options: [
        {
          name: "tag",
          description: "The tag you want to use for this sticker.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "image-url",
          description: "The URL of the image you want to use for this sticker.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],

      async handle(interaction) {
        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Stickers can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        const tag = interaction.options.getString("tag", true);
        const imageUrl = interaction.options.getString("image-url", true);

        if (!memberCanManageStickers(interaction.member as GuildMember)) {
          await interaction.reply({
            content: "You don't have permission to add stickers.",
            ephemeral: true,
          });

          return;
        }

        if (!TAG_PATTERN.test(tag)) {
          await interaction.reply({
            content:
              `The tag \`${tag}\` is invalid.\n\n` +
              `For the sake of being easy to remember and type, tags are limited to the following:\n\n` +
              `- lowercase alphanumeric characters\n` +
              `- dashes (\`-\`) and underscores (\`_\`)`,
            ephemeral: true,
          });

          return;
        }

        if (!isValidHttpUrl(imageUrl)) {
          await interaction.reply({
            content: "The URL you provided was invalid.",
            ephemeral: true,
          });

          return;
        }

        try {
          const sticker = await prisma.sticker.create({
            data: {
              guildId: interaction.guildId,
              tag,
              url: imageUrl,
            },
          });

          await interaction.reply({
            content: "Sticker added!",
            embeds: [buildEmbedForSticker(sticker)],
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            await interaction.reply({
              content: "A sticker with that tag already exists.",
              ephemeral: true,
            });
            return;
          } else {
            throw e;
          }
        }
      },
    },
    {
      name: "remove",
      description: "Removes a sticker from the server.",
      options: [
        {
          name: "tag",
          description: "The tag of the sticker you want to remove.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],

      async handle(interaction) {
        const tag = interaction.options.getString("tag", true);

        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Stickers can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        if (!memberCanManageStickers(interaction.member as GuildMember)) {
          await interaction.reply({
            content: "You don't have permission to remove stickers.",
            ephemeral: true,
          });

          return;
        }

        const sticker = await prisma.sticker.findUnique({
          where: {
            guildId_tag: {
              guildId: interaction.guildId,
              tag,
            },
          },
        });

        if (!sticker) {
          await interaction.reply({
            content: `Sticker with tag \`${tag}\` not found.`,
            ephemeral: true,
          });

          return;
        }

        await prisma.sticker.delete({
          where: {
            guildId_tag: {
              guildId: interaction.guildId,
              tag,
            },
          },
        });

        await interaction.reply({
          content: `Sticker \`${tag}\` successfully removed.`,
        });
      },
    },
    {
      name: "list",
      description: "Lists the stickers for the server.",

      async handle(interaction) {
        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Stickers can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        const stickers = await prisma.sticker.findMany({
          where: {
            guildId: interaction.guildId,
          },
        });

        if (stickers.length === 0) {
          await interaction.reply(
            `This server doesn't have any stickers (yet).`
          );
          return;
        }

        await interaction.reply({
          embeds: [
            {
              title: `Stickers for ${interaction.guild!.name}`,
              description: stickers
                .map((s) => hyperlink(s.tag, s.url))
                .join(`\n`),
            },
          ],
        });
      },
    },
    {
      name: "show",
      description: "Shows the sticker with the given tag.",
      options: [
        {
          name: "tag",
          description: "The tag of the sticker you want to show.",
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],

      async handle(interaction) {
        if (!interaction.inGuild()) {
          interaction.reply({
            content: `Stickers can only be managed in a server.`,
            ephemeral: true,
          });
          return;
        }

        const tag = interaction.options.getString("tag", true);

        const sticker = await prisma.sticker.findUnique({
          where: {
            guildId_tag: {
              guildId: interaction.guildId,
              tag,
            },
          },
        });

        if (!sticker) {
          await interaction.reply({
            content: `Sticker with tag \`${tag}\` not found.`,
            ephemeral: true,
          });

          return;
        }

        await interaction.reply({
          embeds: [buildEmbedForSticker(sticker)],
        });
      },
    },
  ];
}

const memberCanManageStickers = (member: GuildMember) => {
  if (member.user.id === config.ownerId) {
    return true;
  }

  if (
    member.permissions.has("ManageMessages") ||
    (config.guilds[member.guild.id]?.stickers?.stickerManagerRoleId !==
      undefined &&
      member.roles.cache.has(
        config.guilds[member.guild.id]!.stickers!.stickerManagerRoleId!
      ))
  ) {
    return true;
  }

  return false;
};

const StickersModule: Module = {
  commands: [new StickersCommand()],
  handlers: {},
};

const buildEmbedForSticker = (sticker: Sticker): APIEmbed => ({
  title: sticker.tag,
  image: {
    url: sticker.url,
  },
});

export default StickersModule;
