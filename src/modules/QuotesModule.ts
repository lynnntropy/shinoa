import { Quote } from ".prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime";
import {
  APIApplicationCommandOption,
  APIEmbed,
  APIInteraction,
  ApplicationCommandInteractionDataOptionString,
  ApplicationCommandInteractionDataOptionSubCommand,
  ApplicationCommandOptionType,
  InteractionResponseType,
} from "discord-api-types";
import client from "../client";
import { respondToInteraction } from "../discord/api";
import prisma from "../prisma";
import { Command, Module, SerializableMessage } from "../types";
import { buildSerializableMessage } from "../utils/structures";
import * as mime from "mime-types";
import { isGuildInteraction } from "discord-api-types/utils/v8";
import { PermissionResolvable } from "discord.js";

class QuotesCommand implements Command {
  name = "quotes";
  description = "Quotes";
  options: APIApplicationCommandOption[] = [
    {
      name: "add",
      description: "Adds a quote.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: "message_id",
          description: "The ID of the message you want to quote.",
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
    },
    {
      name: "search",
      description: "Gets the quote that's the closest match for a given query.",
      type: ApplicationCommandOptionType.SUB_COMMAND,
      options: [
        {
          name: "query",
          description: "The query to search for.",
          type: ApplicationCommandOptionType.STRING,
          required: true,
        },
      ],
    },
  ];
  requiredPermissions: PermissionResolvable[] = ["MANAGE_MESSAGES"];

  // TODO /quote add :messageId
  // TODO /quote remove :messageId

  async handle(interaction: APIInteraction) {
    if (!isGuildInteraction(interaction)) {
      throw new Error("Command must be called inside a guild.");
    }

    const subcommand = interaction.data.options[0].name as "add" | "search";

    if (subcommand === "add") {
      const messageId = ((interaction.data
        .options[0] as ApplicationCommandInteractionDataOptionSubCommand)
        .options[0] as ApplicationCommandInteractionDataOptionString).value;

      const channel = await client.channels.fetch(interaction.channel_id);
      if (!channel.isText()) {
        throw new Error("Command must be called in a text channel.");
      }

      const message = buildSerializableMessage(
        await channel.messages.fetch(messageId)
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
        if (e instanceof PrismaClientKnownRequestError && e.code === "P2002") {
          await respondToInteraction(interaction, {
            type: InteractionResponseType.ChannelMessageWithSource,
            data: { content: "That message has already been quoted." },
          });
        } else {
          throw e;
        }
      }

      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          content: "Quote added!",
          embeds: [buildEmbedForQuotedMessage(message)],
        },
      });
    }

    if (subcommand === "search") {
      const query = ((interaction.data
        .options[0] as ApplicationCommandInteractionDataOptionSubCommand)
        .options[0] as ApplicationCommandInteractionDataOptionString).value;

      const results = await prisma.$queryRaw<Quote[]>`SELECT
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
        WHERE "guildId" = ${interaction.guild_id}
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
        await respondToInteraction(interaction, {
          type: InteractionResponseType.ChannelMessageWithSource,
          data: { content: "No quotes found for that query." },
        });

        return;
      }

      const quote = results[0];

      await respondToInteraction(interaction, {
        type: InteractionResponseType.ChannelMessageWithSource,
        data: {
          embeds: [
            buildEmbedForQuotedMessage(quote.message as SerializableMessage),
          ],
        },
      });
    }
  }
}

const buildEmbedForQuotedMessage = (message: SerializableMessage): APIEmbed => {
  const embed: APIEmbed = {
    author: {
      name: `${message.author.username}#${message.author.discriminator}`,
    },
    description: message.content,
    fields: [],
  };

  // TODO fetch the user and use their current name/avatar/etc. if they're still in the guild

  // TODO show author avatar, createdAt, etc.

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
    embed.fields.push({ name: "Video", value: video.url });
  }

  return embed;
};

const QuotesModule: Module = {
  commands: [new QuotesCommand()],
  handlers: {},
};

export default QuotesModule;
