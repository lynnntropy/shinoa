import { discordeno } from "../deps.ts";

export interface Command {
  name: string;
  description: string;
  options?: discordeno.SlashCommandOption[];
  requiredPermissions?: discordeno.Permission[];
  isOwnerOnly?: boolean;

  process: (input: CommandInput) => unknown;
}

export type CommandInput = Omit<
  discordeno.InteractionCommandPayload,
  "member"
> & {
  member: discordeno.Member;
};
