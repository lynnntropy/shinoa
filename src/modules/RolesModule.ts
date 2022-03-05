import { Snowflake } from "discord.js";
import { Module } from "../internal/types";

export type GuildRolesMessageConfig =
  | {
      id: Snowflake;
    } & (
      | {
          type: "select";
          options: {
            roleId: Snowflake;
            label: string;
            description: string;
            emoji: {
              name: string;
              id: Snowflake;
            };
          }[];
        }
      | {
          type: "reaction";
          options: {
            roleId: Snowflake;
            emoji: {
              name: string;
              id: Snowflake;
            };
          }[];
        }
    );

export interface GuildRolesConfig {
  messages: GuildRolesMessageConfig[];
}

// todo create and/or update initial message
// todo respond to select interactions
// todo respond to reactions

const RolesModule: Module = {
  commands: [],
  handlers: {},
};

export default RolesModule;
