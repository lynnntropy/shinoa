import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  APIInteraction,
  APIInteractionResponse,
  RESTGetAPIApplicationGuildCommandsResult,
  RESTPostAPIApplicationCommandsResult,
  RESTPostAPIApplicationGuildCommandsResult,
  Snowflake,
} from "discord-api-types/v8";
import config from "../config";
import environment from "../environment";
import logger from "../logger";
import { Command } from "../types";
import { buildApplicationCommandBodyFromCommand } from "./utils";

const client = axios.create({
  baseURL: "https://discord.com/api/v8",
  headers: {
    Authorization: `Bot ${environment.TOKEN}`,
  },
});

function sendDiscordAPIRequest<T = any, R = AxiosResponse<T>>(
  config: AxiosRequestConfig
): Promise<R> {
  logger.debug(`Discord API request: ${config.method} ${config.url}`);
  logger.trace(config);
  return client.request(config);
}

export const registerCommand = async (
  command: Command,
  guildId?: Snowflake
) => {
  const url = guildId
    ? `/applications/${config.applicationId}/guilds/${guildId}/commands`
    : `/applications/${config.applicationId}/commands`;

  return (
    await sendDiscordAPIRequest<
      | RESTPostAPIApplicationCommandsResult
      | RESTPostAPIApplicationGuildCommandsResult
    >({
      method: "POST",
      url,
      data: buildApplicationCommandBodyFromCommand(command),
    })
  ).data;
};

export const respondToInteraction = async (
  interaction: APIInteraction,
  payload: APIInteractionResponse
): Promise<void> => {
  return await sendDiscordAPIRequest({
    method: "POST",
    url: `/interactions/${interaction.id}/${interaction.token}/callback`,
    data: payload,
  });
};

export const getGuildCommands = async (guildId: Snowflake) => {
  return (
    await sendDiscordAPIRequest<RESTGetAPIApplicationGuildCommandsResult>({
      method: "GET",
      url: `/applications/${config.applicationId}/guilds/${guildId}/commands`,
    })
  ).data;
};

export const deleteGuildCommand = async (
  guildId: Snowflake,
  commandId: Snowflake
) => {
  return await sendDiscordAPIRequest({
    method: "DELETE",
    url: `/applications/${config.applicationId}/guilds/${guildId}/commands/${commandId}`,
  });
};
