import {
  APIApplicationCommandOption,
  APIInteraction,
} from "discord-api-types/v8";
import { PermissionResolvable } from "discord.js";

export interface Command {
  name: string;
  description: string;
  options?: APIApplicationCommandOption[];
  requiredPermissions?: PermissionResolvable;
  isOwnerOnly?: boolean;
  defaultPermission?: boolean;

  handle: (input: APIInteraction) => Promise<unknown>;
}

export interface EventHandler<T> {
  (payload: T): Promise<unknown>;
}

export interface HandlerCollection {
  [event: string]: EventHandler<unknown>[];
}

export interface Module {
  commands: Command[];
  handlers: HandlerCollection;
}
