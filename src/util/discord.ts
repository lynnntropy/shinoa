import { log, discordeno } from "../../deps.ts";
import config from "../config.ts";

const sendAuthenticatedRequest = async (
  method = "GET",
  path: string,
  body?: unknown
): Promise<Response> => {
  log.debug(`sendAuthenticatedRequest: ${method} ${path}`);

  const response = await fetch(`https://discord.com/api${path}`, {
    method,
    body: JSON.stringify(body),
    headers: {
      Authorization: `Bot ${Deno.env.get("TOKEN") as string}`,
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    throw new Error(response.statusText);
  }

  return response;
};

export const createSlashCommand = async (
  options: discordeno.CreateSlashCommandOptions
) => {
  const path = options.guildID
    ? `/applications/${config.applicationId}/guilds/${options.guildID}/commands`
    : `/applications/${config.applicationId}/commands`;

  return await sendAuthenticatedRequest("POST", path, options);
};
