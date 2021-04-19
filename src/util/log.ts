import { log, discordeno } from "../../deps.ts";
import { CommandInput } from "../types.ts";

export const logInteraction = (input: CommandInput) => {
  const guild = discordeno.cache.guilds.get(input.guild_id);
  const channel = discordeno.cache.channels.get(input.channel_id);

  log.info(
    `Command /${input.data?.name} ` +
      `used by ${input.member.name(input.guild_id)} ` +
      `(${input.member.username}#${input.member.discriminator}) ` +
      `in ${guild?.name} -> #${channel?.name}`
  );
};

export const logMessage = (input: discordeno.Message) => {
  const guild = input.guild;
  const channel = input.channel;

  if (guild !== undefined && input.member !== undefined) {
    log.debug(
      `[${guild.name ?? "(no guild)"} -> #${
        channel?.name ?? "(no channel)"
      }] ` +
        `${input.member.name(guild.id)} ` +
        `(${input.author.username}#${input.author.discriminator}): ` +
        `${input.content}`
    );
  } else {
    log.debug(
      `[? -> #${channel?.name ?? "(no channel)"}] ` +
        `${input.author.username}#${input.author.discriminator}: ${input.content}`
    );
  }
};
