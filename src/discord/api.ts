import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import {
  APIApplicationCommand,
  APIInteraction,
  APIInteractionResponse,
  APIInteractionResponseChannelMessageWithSource,
  InteractionResponseType,
  RESTGetAPIApplicationCommandsResult,
  RESTGetAPIApplicationGuildCommandsResult,
  RESTPatchAPIApplicationCommandResult,
  RESTPatchAPIApplicationGuildCommandResult,
  RESTPatchAPIWebhookWithTokenMessageResult,
  RESTPostAPIApplicationCommandsResult,
  RESTPostAPIApplicationGuildCommandsResult,
  Snowflake,
} from "discord-api-types/v8";
import config from "../config";
import environment from "../environment";
import logger from "../logger";
import { Command } from "../types";
import { buildApplicationCommandBodyFromCommand } from "./utils";
import * as FormData from "form-data";
import { merge } from "lodash";

interface RateLimitState {
  routeKeyBucketMappings: { [routeKey: string]: string };
  buckets: {
    [bucket: string]: {
      remaining: number;
      resetsAt: Date;
    };
  };
}

const rateLimitState: RateLimitState = {
  routeKeyBucketMappings: {},
  buckets: {},
};

const client = axios.create({
  baseURL: "https://discord.com/api/v8",
  headers: {
    Authorization: `Bot ${environment.TOKEN}`,
  },
});

async function sendDiscordAPIRequest<T = any, R = AxiosResponse<T>>(
  routeKey: string,
  config: AxiosRequestConfig
): Promise<R> {
  logger.debug(`(Discord) ${config.method} ${config.url}`);
  logger.trace(config);

  const bucket = rateLimitState.routeKeyBucketMappings[routeKey];
  const bucketState = rateLimitState.buckets[bucket];

  if (
    bucketState &&
    bucketState.remaining <= 0 &&
    bucketState.resetsAt > new Date()
  ) {
    const timeUntilResetMs =
      bucketState.resetsAt.getTime() - new Date().getTime();

    logger.warn(
      `Hit rate limit for route key ${routeKey} (bucket ${bucket}). ` +
        `Waiting ${timeUntilResetMs / 1000}s.`
    );

    await new Promise((yay) => setTimeout(yay, timeUntilResetMs));
  }

  let response: AxiosResponse;

  try {
    response = await client.request(config);
  } catch (e) {
    if (axios.isAxiosError(e)) {
      logger.trace(e.response.data);
    }
    throw e;
  }

  const rateLimitBucket = response.headers["x-ratelimit-bucket"];
  const rateLimitRemaining = Number(response.headers["x-ratelimit-remaining"]);
  const rateLimitResetsAt = new Date(
    Number(response.headers["x-ratelimit-reset"]) * 1000
  );

  if (rateLimitBucket) {
    rateLimitState.routeKeyBucketMappings[routeKey] = rateLimitBucket;
    rateLimitState.buckets[rateLimitBucket] = {
      remaining: rateLimitRemaining,
      resetsAt: rateLimitResetsAt,
    };

    logger.trace(
      `Rate limit bucket ${rateLimitBucket}: ${rateLimitRemaining} requests remaining`
    );
  }

  return (response as unknown) as R;
}

export const registerCommand = async (
  command: Command,
  guildId?: Snowflake
) => {
  const url = guildId
    ? `/applications/${config.applicationId}/guilds/${guildId}/commands`
    : `/applications/${config.applicationId}/commands`;

  const routeKey = guildId
    ? "POST_/applications/:applicationId/guilds/:guildId/commands"
    : "POST_/applications/:applicationId/commands";

  return (
    await sendDiscordAPIRequest<
      | RESTPostAPIApplicationCommandsResult
      | RESTPostAPIApplicationGuildCommandsResult
    >(routeKey, {
      method: "POST",
      url,
      data: buildApplicationCommandBodyFromCommand(command),
    })
  ).data;
};

export const updateRegisteredCommand = async (
  registeredCommand: APIApplicationCommand,
  command: Command,
  guildId?: Snowflake
) => {
  const url = guildId
    ? `/applications/${config.applicationId}/guilds/${guildId}/commands/${registeredCommand.id}`
    : `/applications/${config.applicationId}/commands/${registeredCommand.id}`;

  const routeKey = guildId
    ? "POST_/applications/:applicationId/guilds/:guildId/commands/:commandId"
    : "POST_/applications/:applicationId/commands/:commandId";

  return (
    await sendDiscordAPIRequest<
      | RESTPatchAPIApplicationCommandResult
      | RESTPatchAPIApplicationGuildCommandResult
    >(routeKey, {
      method: "PATCH",
      url,
      data: buildApplicationCommandBodyFromCommand(command),
    })
  ).data;
};

export const respondToInteraction = async (
  interaction: APIInteraction,
  payload: APIInteractionResponse
): Promise<void> => {
  if (payload.type === InteractionResponseType.ChannelMessageWithSource) {
    payload = merge<
      APIInteractionResponseChannelMessageWithSource,
      Partial<APIInteractionResponseChannelMessageWithSource>
    >(payload, {
      data: { allowed_mentions: { parse: [] } },
    });
  }

  return await sendDiscordAPIRequest(
    "POST_/interactions/:interactionId/:interactionToken/callback",
    {
      method: "POST",
      url: `/interactions/${interaction.id}/${interaction.token}/callback`,
      data: payload,
    }
  );
};

export const editOriginalInteractionResponse = async (
  interaction: APIInteraction,
  payload: FormData
) => {
  return (
    await sendDiscordAPIRequest<RESTPatchAPIWebhookWithTokenMessageResult>(
      "PATCH_/webhooks/:applicationId/:interactionToken/messages/@original",
      {
        method: "PATCH",
        url: `/webhooks/${config.applicationId}/${interaction.token}/messages/@original`,
        headers: payload.getHeaders(),
        data: payload,
      }
    )
  ).data;
};

export const getGuildCommands = async (guildId: Snowflake) => {
  return (
    await sendDiscordAPIRequest<RESTGetAPIApplicationGuildCommandsResult>(
      "GET_/applications/:applicationId/guilds/:guildId/commands",
      {
        method: "GET",
        url: `/applications/${config.applicationId}/guilds/${guildId}/commands`,
      }
    )
  ).data;
};

export const deleteGuildCommand = async (
  guildId: Snowflake,
  commandId: Snowflake
) => {
  return await sendDiscordAPIRequest(
    "DELETE_/applications/:applicationId/guilds/:guildId/commands/:commandId",
    {
      method: "DELETE",
      url: `/applications/${config.applicationId}/guilds/${guildId}/commands/${commandId}`,
    }
  );
};

export const getGlobalCommands = async () => {
  return (
    await sendDiscordAPIRequest<RESTGetAPIApplicationCommandsResult>(
      "GET_/applications/:applicationId/commands",
      {
        method: "GET",
        url: `/applications/${config.applicationId}/commands`,
      }
    )
  ).data;
};

export const deleteGlobalCommand = async (commandId: Snowflake) => {
  return await sendDiscordAPIRequest(
    "DELETE_/applications/:applicationId/commands/:commandId",
    {
      method: "DELETE",
      url: `/applications/${config.applicationId}/commands/${commandId}`,
    }
  );
};
