import {
  APIApplicationCommandOption,
  Permissions,
  APIInteraction,
} from "discord-api-types/v8";

export interface Command {
  name: string;
  description: string;
  options?: APIApplicationCommandOption[];
  requiredPermissions?: Permissions;
  isOwnerOnly?: boolean;
  defaultPermission?: boolean;

  handle: (input: APIInteraction) => unknown;
}

export interface EventHandler<T> {
  (payload: T): Promise<unknown>;
}
