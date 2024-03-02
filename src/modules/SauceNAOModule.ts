import axios from "axios";
import {
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  ChatInputCommandInteraction,
  Colors,
} from "discord.js";
import { Command } from "../internal/command";
import { Module } from "../internal/types";
import { EmbedBuilder } from "@discordjs/builders";

class SauceNAOCommand extends Command {
  name = "saucenao";
  description = "Find the source for an image using SauceNAO.";
  options: ApplicationCommandOptionData[] = [
    {
      name: "image-url",
      description:
        "The image URL to search. If omitted, will use the last image posted in the channel.",
      type: ApplicationCommandOptionType.String,
    },
  ];

  async handle(interaction: ChatInputCommandInteraction) {
    let imageUrl = interaction.options.getString("image-url");

    if (imageUrl === null) {
      const message = (await interaction.channel!.messages.fetch())
        .sort((a, b) => b.createdTimestamp - a.createdTimestamp)
        .filter(
          (m) =>
            m.attachments.size > 0 ||
            /^https?:\/\/\S+$/.test(m.cleanContent.trim())
        )
        .first();

      if (!message) {
        interaction.reply({
          content: "I couldn't find an image in this channel.",
          ephemeral: true,
        });
        return;
      }

      imageUrl =
        message.attachments.first()?.url ?? message.cleanContent.trim();
    }

    const response = await searchImageUrl(imageUrl as string);

    for (const result of response.results) {
      if (
        Number(result.header.similarity) < response.header.minimum_similarity
      ) {
        continue;
      }

      const embed = new EmbedBuilder()
        .setColor(Colors.Green)
        .setThumbnail(result.header.thumbnail)
        .setTitle(result.data.title ?? "[no title]")
        .setURL(result.data.ext_urls[0])
        .setFooter({ text: result.header.index_name });

      if (result.data.author_url) {
        embed.addFields({
          name: "Author",
          value: `[${result.data.author_name}](${result.data.author_url})`,
        });
      }

      if (result.data.member_id) {
        embed.addFields({
          name: "Author",
          value: `[${result.data.member_name}](https://www.pixiv.net/en/users/${result.data.member_id})`,
        });
      }

      await interaction.reply({ embeds: [embed] });
      return;
    }

    const embed = new EmbedBuilder()
      .setColor(Colors.Grey)
      .setDescription("No match found.");

    await interaction.reply({ embeds: [embed] });
  }
}

interface SauceNAOResponse {
  header: {
    status: number;
    minimum_similarity: number;
    results_returned: number;
  };
  results: {
    header: {
      similarity: string;
      thumbnail: string;
      index_id: number;
      index_name: string;
    };
    data: {
      ext_urls: string[];
      title?: string;
      author_name?: string;
      author_url?: string;
      member_name?: string;
      member_id?: string;
    };
  }[];
}

const searchImageUrl = async (imageUrl: string): Promise<SauceNAOResponse> => {
  const apiKey = process.env.SAUCENAO_API_KEY;

  if (!apiKey) {
    throw Error(
      "The `SAUCENAO_API_KEY` environmment variable must be set for the SauceNAO module to work."
    );
  }

  const { data } = await axios.get<SauceNAOResponse>(
    "https://saucenao.com/search.php",
    {
      params: {
        db: "999",
        output_type: 2,
        numres: 16,
        url: imageUrl,
        api_key: apiKey,
      },
    }
  );

  if (data.header.status !== 0) {
    throw Error(`SauceNAO returned non-zero status ${data.header.status}.`);
  }

  return data;
};

const SauceNAOModule: Module = {
  commands: [new SauceNAOCommand()],
  handlers: {},
};

export default SauceNAOModule;
