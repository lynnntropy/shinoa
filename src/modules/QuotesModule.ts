import { Prisma, Quote } from ".prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import client from "../client";
import prisma from "../prisma";
import { buildSerializableMessage } from "../utils/structures";
import * as mime from "mime-types";
import { Snowflake, MessageEmbedOptions } from "discord.js";
import logger from "../logger";
import config from "../config";
import { Command, CommandSubCommand } from "../internal/command";
import { Module, SerializableMessage } from "../internal/types";

// TODO tie /quote add to a role rather than a permission
// TODO add some way to page through search results
// TODO migrate images for Philia quotes
// TODO show IDs and allow get/delete based on those?

class QuotesCommand extends Command {
  name = "quotes";
  description = "Quotes";

  subCommands: CommandSubCommand[] = [
    {
      name: "add",
      description: "Adds a quote.",
      options: [
        {
          name: "message_id",
          description: "The ID of the message you want to quote.",
          type: "STRING",
          required: true,
        },
      ],

      async handle(interaction) {
        const member = await (
          await client.guilds.fetch(interaction.guildID)
        ).members.fetch(interaction.member.user.id);

        if (
          member.user.id !== config.ownerId &&
          !member.permissions.has("MANAGE_MESSAGES") &&
          !member.roles.cache.has(
            config.guilds[interaction.guild.id]?.quotes?.quoteManagerRoleId
          )
        ) {
          await interaction.reply({
            content: "You need the MANAGE_MESSAGES permission to add quotes.",
            ephemeral: true,
          });

          return;
        }

        const messageId = interaction.options[0].value as string;

        if (!interaction.channel.isText()) {
          throw new Error("Command must be called in a text channel.");
        }

        const message = buildSerializableMessage(
          await interaction.channel.messages.fetch(messageId)
        );

        try {
          await prisma.quote.create({
            data: {
              guildId: message.guild.id,
              userId: message.author.id,
              messageId: message.id,
              message,
            },
          });
        } catch (e) {
          if (
            e instanceof PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            await interaction.reply("That message has already been quoted.");
            return;
          } else {
            throw e;
          }
        }

        await interaction.reply({
          content: "Quote added!",
          embeds: [await buildEmbedForQuotedMessage(message)],
        });
      },
    },
    {
      name: "search",
      description: "Gets the quote that's the closest match for a given query.",
      options: [
        {
          name: "query",
          description: "The query to search for.",
          type: "STRING",
          required: true,
        },
        {
          name: "user",
          description: "Restrict the search to quotes from a specific user.",
          type: "USER",
        },
      ],

      async handle(interaction) {
        const query = interaction.options[0].value as string;

        let userId: Snowflake;

        if (interaction.options[1]) {
          userId = interaction.options[1].value as string;
        }

        const results = await prisma.$queryRaw<Quote[]>`
          SELECT
          *,
          ts_rank_cd(
            to_tsvector(
              message ->> 'content' || ' ' ||
              coalesce(message #>> '{author,username}', '') || ' ' ||
              coalesce(message #>> '{member,nickname}', '')
            ),
            plainto_tsquery(${query})
          ) AS rank
          FROM "Quote"
          WHERE "guildId" = ${interaction.guild.id}
            ${userId ? Prisma.sql`AND "userId" = ${userId}` : Prisma.empty}
            AND to_tsvector(
              message ->> 'content' || ' ' ||
              coalesce(message #>> '{author,username}', '') || ' ' ||
              coalesce(message #>> '{member,nickname}', '')
            )
            @@ plainto_tsquery(${query})
          ORDER BY rank DESC
          LIMIT 1;
        `;

        if (!results.length) {
          await interaction.reply("No quotes found for that query.");

          return;
        }

        const quote = results[0];

        await interaction.reply({
          embeds: [
            await buildEmbedForQuotedMessage(
              quote.message as SerializableMessage
            ),
          ],
        });
      },
    },
    {
      name: "random",
      description: "Shows a random quote.",
      options: [
        {
          name: "user",
          description: "Restricts the command to quotes from a specific user.",
          type: "USER",
        },
      ],

      async handle(interaction) {
        let userId: Snowflake;

        if (interaction.options) {
          userId = interaction.options[0].value as string;
        }

        const results = await prisma.$queryRaw<Quote[]>`
        SELECT
        *
        FROM "Quote"
        WHERE "guildId" = ${interaction.guild.id}
          ${userId ? Prisma.sql`AND "userId" = ${userId}` : Prisma.empty}
        ORDER BY random()
        LIMIT 1;
        `;

        if (!results.length) {
          await interaction.reply("No quotes found.");

          return;
        }

        const quote = results[0];

        await interaction.reply({
          embeds: [
            await buildEmbedForQuotedMessage(
              quote.message as SerializableMessage
            ),
          ],
        });
      },
    },
  ];

  async commandWillExecute(interaction) {
    if (interaction.guild === null) {
      await interaction.reply({
        content: "This command can only be called inside a server.",
        ephemeral: true,
      });

      throw new Error("Command can't be called outside of a guild.");
    }
  }
}

const buildEmbedForQuotedMessage = async (
  message: SerializableMessage
): Promise<MessageEmbedOptions> => {
  const embed: MessageEmbedOptions = {
    author: {
      name: `${message.author.username}#${message.author.discriminator}`,
      iconURL: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}`,
    },
    description: message.content,
    timestamp: new Date(message.createdAt as unknown as string),
    fields: [],
  };

  try {
    const member = await (
      await client.guilds.fetch(message.guild.id)
    ).members.fetch(message.author.id);

    embed.author = {
      name:
        member.nickname ??
        `${member.user.username}#${member.user.discriminator}`,
      iconURL: `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}`,
    };
  } catch (e) {
    logger.debug(`Couldn't fetch a member for user ID ${message.author.id}.`);
  }

  const image = message.attachments.find((a) =>
    (mime.lookup(a.url) || "unknown").startsWith("image/")
  );
  const video = message.attachments.find((a) =>
    (mime.lookup(a.url) || "unknown").startsWith("video/")
  );

  if (image !== undefined) {
    embed.image = { url: image.url };
  }

  if (video !== undefined) {
    embed.fields.push({ name: "Video", value: video.url, inline: false });
  }

  return embed;
};

const QuotesModule: Module = {
  commands: [new QuotesCommand()],
  handlers: {},
};

export default QuotesModule;
