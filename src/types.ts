import { discordeno } from "../deps.ts";

export interface Command {
  readonly name: string;
  readonly description: string;
  readonly options?: discordeno.SlashCommandOption[];

  process: (input: CommandInput) => unknown;
}

export type CommandInput = Omit<
  discordeno.InteractionCommandPayload,
  "member"
> & {
  member: discordeno.Member;
};
