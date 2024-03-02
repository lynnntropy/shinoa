import { userMention } from "@discordjs/builders";
import {
  ApplicationCommandOptionData,
  ApplicationCommandOptionType,
  CommandInteraction,
  EmbedBuilder,
  GuildMember,
} from "discord.js";
import { Command } from "../../internal/command";
import { Module } from "../../internal/types";
import * as weeb from "../../weeb";

interface CommandMapping {
  name: string;
  imageType: string;
  targetMessage: (member1: GuildMember, member2: GuildMember) => string;
  autoMessage: (member: GuildMember) => string;
}

const commandMappings: CommandMapping[] = [
  {
    name: "baka",
    imageType: "baka",
    targetMessage: (m1, m2) =>
      `${m1.displayName} said: ${m2.displayName}, you baka!`,
    autoMessage: (m) => `${m.displayName} said: you baka!`,
  },
  {
    name: "bite",
    imageType: "bite",
    targetMessage: (m1, m2) => `${m1.displayName} bit ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} bit... themselves?`,
  },
  {
    name: "cuddle",
    imageType: "cuddle",
    targetMessage: (m1, m2) =>
      `${m1.displayName} cuddled with ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} cuddled with... themselves?`,
  },
  {
    name: "dab",
    imageType: "dab",
    targetMessage: (m1, m2) => `${m1.displayName} dabbed on ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} dabbed!`,
  },
  {
    name: "handhold",
    imageType: "handholding",
    targetMessage: (m1, m2) =>
      `${m1.displayName} held ${m2.displayName}'s hand!`,
    autoMessage: (m) => `${m.displayName} held... their own hand?`,
  },
  {
    name: "hug",
    imageType: "hug",
    targetMessage: (m1, m2) => `${m1.displayName} hugged ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} hugged... themselves?`,
  },
  {
    name: "kiss",
    imageType: "kiss",
    targetMessage: (m1, m2) => `${m1.displayName} kissed ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} kissed... themselves?`,
  },
  {
    name: "lick",
    imageType: "lick",
    targetMessage: (m1, m2) => `${m1.displayName} licked ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} licked... themselves?`,
  },
  {
    name: "nom",
    imageType: "nom",
    targetMessage: (m1, m2) => `${m1.displayName} nommed ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} nommed... themselves?`,
  },
  {
    name: "owo",
    imageType: "owo",
    targetMessage: (m1, m2) => `${m1.displayName} owo'd on ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} owo'd!`,
  },
  {
    name: "pat",
    imageType: "pat",
    targetMessage: (m1, m2) => `${m1.displayName} patted ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} patted... themselves?`,
  },
  {
    name: "pout",
    imageType: "pout",
    targetMessage: (m1, m2) => `${m1.displayName} pouted at ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} pouted!`,
  },
  {
    name: "slap",
    imageType: "slap",
    targetMessage: (m1, m2) => `${m1.displayName} slapped ${m2.displayName}!`,
    autoMessage: (m) => `${m.displayName} slapped... themselves?`,
  },
];

const commands: Command[] = commandMappings.map((mapping) => {
  const command = class extends Command {
    name = mapping.name;
    description = `Use Shinoa to ${mapping.name} someone.`;
    options: ApplicationCommandOptionData[] = [
      {
        name: "user",
        description: `A person you want to ${mapping.name}.`,
        type: ApplicationCommandOptionType.User,
      },
    ];

    async handle(interaction: CommandInteraction) {
      const user = interaction.options.getMember("user") as GuildMember | null;

      const embed = new EmbedBuilder();

      if (user) {
        embed.setTitle(
          mapping.targetMessage(interaction.member as GuildMember, user)
        );
      } else {
        embed.setTitle(mapping.autoMessage(interaction.member as GuildMember));
      }

      const image = await weeb.getRandomImage({
        type: mapping.imageType,
      });

      embed.setImage(image.url);

      await interaction.reply({
        content: user ? userMention(user.user.id) : undefined,
        embeds: [embed],
        allowedMentions: {
          users: user ? [user.user.id] : undefined,
        },
      });
    }
  };

  return new command();
});

const WeebModule: Module = {
  commands,
  handlers: {},
};

export default WeebModule;
