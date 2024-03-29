import { Prisma, Quote } from "@prisma/client";
import client from "../client";
import prisma from "../prisma";
import { buildSerializableMessage } from "../utils/structures";
import * as mime from "mime-types";
import {
  Snowflake,
  GuildMember,
  MessageReaction,
  CommandInteraction,
  ApplicationCommandOptionType,
  ChannelType,
  APIEmbed,
} from "discord.js";
import logger from "../logger";
import config from "../config";
import { Command, CommandSubCommand } from "../internal/command";
import { Module, SerializableMessage } from "../internal/types";
import { buildUsernameString } from "../utils/strings";

const PREVIOUS_REACTION_EMOJI = "⏮";
const NEXT_REACTION_EMOJI = "⏭";

// TODO migrate images for Philia quotes

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
          type: ApplicationCommandOptionType.String,
          required: true,
        },
      ],

      async handle(interaction) {
        const member = await (
          await client.guilds.fetch(interaction.guildId!)
        ).members.fetch(interaction.member!.user.id);

        if (!memberCanManageQuotes(member)) {
          await interaction.reply({
            content: "You don't have permission to add quotes.",
            ephemeral: true,
          });

          return;
        }

        const messageId = interaction.options.data[0].value as string;

        if (interaction.channel!.type !== ChannelType.GuildText) {
          throw new Error("Command must be called in a text channel.");
        }

        const message = buildSerializableMessage(
          await interaction.channel!.messages.fetch(messageId)
        );

        try {
          const quote = await prisma.quote.create({
            data: {
              guildId: message.guild.id,
              userId: message.author.id,
              messageId: message.id,
              message,
            },
          });

          await interaction.reply({
            content: "Quote added!",
            embeds: [
              await buildEmbedForQuotedMessage(
                quote.message as SerializableMessage,
                quote.id
              ),
            ],
          });
        } catch (e) {
          if (
            e instanceof Prisma.PrismaClientKnownRequestError &&
            e.code === "P2002"
          ) {
            await interaction.reply("That message has already been quoted.");
            return;
          } else {
            throw e;
          }
        }
      },
    },
    {
      name: "delete",
      description: "Deletes a quote.",
      options: [
        {
          name: "quote_number",
          description: "The number of the quote you want to delete.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],

      async handle(interaction) {
        const member = await (
          await client.guilds.fetch(interaction.guildId!)
        ).members.fetch(interaction.member!.user.id);

        if (!memberCanManageQuotes(member)) {
          await interaction.reply({
            content: "You don't have permission to delete quotes.",
            ephemeral: true,
          });

          return;
        }

        const number = interaction.options.data[0].value as number;
        await prisma.quote.delete({ where: { id: number } });

        await interaction.reply(`Quote #${number} deleted.`);
      },
    },
    {
      name: "show",
      description: "Shows a specific quote.",
      options: [
        {
          name: "quote_number",
          description: "The number of the quote you want to show.",
          type: ApplicationCommandOptionType.Integer,
          required: true,
        },
      ],

      async handle(interaction) {
        const number = interaction.options.data[0].value as number;
        const quote = await prisma.quote.findUnique({ where: { id: number } });

        if (quote === null) {
          await interaction.reply({
            content: "Sorry, I couldn't find that quote.",
          });
          return;
        }

        await interaction.reply({
          embeds: [
            await buildEmbedForQuotedMessage(
              quote.message as SerializableMessage,
              quote.id
            ),
          ],
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
          type: ApplicationCommandOptionType.String,
          required: true,
        },
        {
          name: "user",
          description: "Restrict the search to quotes from a specific user.",
          type: ApplicationCommandOptionType.User,
        },
      ],

      async handle(interaction) {
        const query = interaction.options.data[0].value as string;
        let userId: Snowflake | undefined = undefined;

        if (interaction.options.data[1]) {
          userId = interaction.options.data[1].value as string;
        }

        await interaction.deferReply();

        const result = (await searchQuotes({
          guildId: interaction.guild!.id,
          query,
          userId,
        })) as SearchResult;

        if (!result) {
          await interaction.editReply("No quotes found for that query.");
          return;
        }

        if (result.total_results === BigInt(1)) {
          await interaction.editReply({
            embeds: [
              await buildEmbedForQuotedMessage(
                result.message as SerializableMessage,
                result.id
              ),
            ],
          });
        } else {
          let offset = 0;

          const renderCurrentQuote = async () => {
            const currentQuote =
              offset === 0
                ? result
                : ((await searchQuotes({
                    guildId: interaction.guild!.id,
                    query,
                    userId,
                    offset,
                  })) as SearchResult);

            await interaction.editReply({
              content: `Showing quote **${offset + 1}** of ${
                result.total_results
              } found.`,
              embeds: [
                await buildEmbedForQuotedMessage(
                  currentQuote.message as SerializableMessage,
                  currentQuote.id
                ),
              ],
            });
          };

          await renderCurrentQuote();

          const reply = await interaction.fetchReply();

          await reply.react(PREVIOUS_REACTION_EMOJI);
          await reply.react(NEXT_REACTION_EMOJI);

          const reactionCollector = reply.createReactionCollector({
            filter: (reaction, user) =>
              user.id === interaction.user.id &&
              [PREVIOUS_REACTION_EMOJI, NEXT_REACTION_EMOJI].includes(
                reaction.emoji.name!
              ),
            dispose: true,
            idle: 300000,
          });

          const onReaction = async (reaction: MessageReaction) => {
            if (reaction.emoji.name === PREVIOUS_REACTION_EMOJI) {
              if (offset <= 0) return;
              offset--;
              await renderCurrentQuote();
            }

            if (reaction.emoji.name === NEXT_REACTION_EMOJI) {
              if (offset >= result.total_results - BigInt(1)) return;
              offset++;
              await renderCurrentQuote();
            }
          };

          reactionCollector.on("collect", onReaction);
          reactionCollector.on("remove", onReaction);
        }
      },
    },
    {
      name: "random",
      description: "Shows a random quote.",
      options: [
        {
          name: "user",
          description: "Restricts the command to quotes from a specific user.",
          type: ApplicationCommandOptionType.User,
        },
      ],

      async handle(interaction) {
        let userId: Snowflake | undefined = undefined;

        if (interaction.options.data[0]) {
          userId = interaction.options.data[0].value as string;
        }

        const results = await prisma.$queryRaw<Quote[]>`
        SELECT
        *
        FROM "Quote"
        WHERE "guildId" = ${interaction.guild!.id}
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
              quote.message as SerializableMessage,
              quote.id
            ),
          ],
        });
      },
    },
  ];

  async commandWillExecute(interaction: CommandInteraction) {
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
  message: SerializableMessage,
  quoteId: number
): Promise<APIEmbed> => {
  const embed: APIEmbed = {
    author: {
      name: buildUsernameString(message.author),
      icon_url: `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}`,
    },
    description: message.content,
    timestamp: new Date(message.createdAt as unknown as string).toISOString(),
    fields: [],
    footer: { text: `Quote #${quoteId}` },
  };

  try {
    const member = await (
      await client.guilds.fetch(message.guild.id)
    ).members.fetch(message.author.id);

    embed.author = {
      name: member.nickname ?? buildUsernameString(member.user),
      icon_url: `https://cdn.discordapp.com/avatars/${member.user.id}/${member.user.avatar}`,
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
    embed.fields!.push({ name: "Video", value: video.url, inline: false });
  }

  return embed;
};

const memberCanManageQuotes = (member: GuildMember) => {
  if (member.user.id === config.ownerId) {
    return true;
  }

  if (
    member.permissions.has("ManageMessages") ||
    member.roles.cache.has(
      config.guilds[member.guild.id]!.quotes!.quoteManagerRoleId!
    )
  ) {
    return true;
  }

  return false;
};

interface SearchInput {
  guildId: Snowflake;
  query?: string;
  userId?: Snowflake;
  offset?: number;
  returnAll?: boolean;
  fetchMembers?: boolean;
}

interface SearchResult extends Quote {
  rank: number;
  total_results: bigint;
}

const searchQuotes = async (input: SearchInput) => {
  let results = await prisma.$queryRaw<SearchResult[]>`
    SELECT
      *,
      ${
        input.query
          ? Prisma.sql`
            ts_rank_cd(
              to_tsvector(
                message ->> 'content' || ' ' ||
                coalesce(message #>> '{author,username}', '') || ' ' ||
                coalesce(message #>> '{member,nickname}', '')
              ),
              plainto_tsquery(${input.query})
            ) AS rank,
          `
          : Prisma.empty
      }
      count(*) OVER() AS total_results
    FROM "Quote"
    WHERE "guildId" = ${input.guildId}
      ${
        input.userId ? Prisma.sql`AND "userId" = ${input.userId}` : Prisma.empty
      }
      ${
        input.query
          ? Prisma.sql`
            AND to_tsvector(
              message ->> 'content' || ' ' ||
              coalesce(message #>> '{author,username}', '') || ' ' ||
              coalesce(message #>> '{member,nickname}', '')
            )
            @@ plainto_tsquery(${input.query})
          `
          : Prisma.empty
      }
      ORDER BY
        ${input.query ? Prisma.sql`rank DESC,` : Prisma.empty}
        id DESC
    ${input.returnAll ? Prisma.empty : Prisma.sql`LIMIT 1`}
    ${
      input.offset !== undefined
        ? Prisma.sql`OFFSET ${input.offset}`
        : Prisma.empty
    }
    ;
  `;

  if (input.fetchMembers) {
    results = await Promise.all(
      results.map(async (result) => {
        const initialMessage: SerializableMessage =
          result.message as unknown as any;

        try {
          const member = await (
            await client.guilds.fetch(result.guildId)
          ).members.fetch(result.userId);

          const message: SerializableMessage = {
            ...initialMessage,
            author: {
              ...initialMessage.author,
              avatar: member.user.avatar,
              discriminator: member.user.discriminator,
              username: member.user.username,
            },
            member: {
              ...initialMessage.member,
              nickname: member.nickname,
            },
          };

          return { ...result, message };
        } catch (e) {
          logger.debug(`Couldn't fetch a member for user ID ${result.userId}.`);
        }

        const message: SerializableMessage = {
          ...initialMessage,
          author: {
            ...initialMessage.author,
            avatar: null,
          },
        };

        return { ...result, message };
      })
    );
  }

  if (input.returnAll) {
    return results;
  } else {
    return results[0];
  }
};

const QuotesModule: Module = {
  commands: [new QuotesCommand()],
  handlers: {},
};

export default QuotesModule;
