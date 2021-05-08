import {
  APIApplicationCommandOption,
  APIInteraction,
} from "discord-api-types/v8";
import { PermissionResolvable, Snowflake } from "discord.js";

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

export interface SerializableMessage {
  id: Snowflake;
  attachments: Array<{ id: Snowflake; url: string }>;
  author: {
    id: Snowflake;
    avatar: string | null;
    discriminator: string;
    username: string;
  };
  channel: {
    id: Snowflake;
  };
  content: string;
  createdAt: Date;
  guild: {
    id: Snowflake;
    name: string;
  };
  member: {
    nickname: string | null;
  };
  [key: string]: any;
}
