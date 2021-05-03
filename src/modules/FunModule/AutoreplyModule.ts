import { APIMessage, GatewayDispatchEvents } from "discord-api-types";
import client from "../../client";
import environment from "../../environment";
import { Module } from "../../types";

const TRIGGER_CHANCE = environment.isProduction ? 0.01 : 1.0;

const handleMessage = async (apiMessage: APIMessage) => {
  if (apiMessage.author.id === client.user.id) {
    return;
  }

  const channel = await client.channels.fetch(apiMessage.channel_id);
  if (!channel.isText()) {
    return;
  }

  const message = await channel.messages.fetch(apiMessage.id);

  if (
    ["uwu", "umu", "owo"].includes(message.cleanContent.trim().toLowerCase())
  ) {
    if (!shouldTrigger()) return;
    await channel.send(message.cleanContent);
  }

  if (message.cleanContent.match(/\w+sus\w+/gi) !== null) {
    if (!shouldTrigger()) return;

    const word = message.cleanContent.match(/\w+sus\w+/gi)[0];
    await channel.send(`> ${word}\nsus`);
  }
};

const shouldTrigger = () => Math.random() <= TRIGGER_CHANCE;

const AutoreplyModule: Module = {
  commands: [],
  handlers: {
    [GatewayDispatchEvents.MessageCreate]: [handleMessage],
  },
};

export default AutoreplyModule;
