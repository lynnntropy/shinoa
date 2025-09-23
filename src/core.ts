import {
  ChatInputCommandInteraction,
  ClientEvents,
  SlashCommandBuilder,
} from "discord.js";

export interface EventHandler<K extends keyof ClientEvents> {
  (...args: ClientEvents[K]): void;
}

export interface HandlerCollection {
  [event: string]: EventHandler<keyof ClientEvents>[];
}

interface SlashCommand {
  signature: SlashCommandBuilder;
  run: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface Module {
  slashCommands?: SlashCommand[];
  handlers?: HandlerCollection;
}
