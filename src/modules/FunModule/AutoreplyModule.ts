import { Message } from "discord.js";
import client from "../../client";
import environment from "../../environment";
import { EventHandler, Module } from "../../internal/types";

const TRIGGER_CHANCE = environment.isProduction ? 0.01 : 1.0;

const handleMessage: EventHandler<"messageCreate"> = async (
  message: Message
) => {
  if (message.author.id === client.user?.id) {
    return;
  }

  if (!message.channel.isText()) {
    return;
  }

  if (
    ["uwu", "umu", "owo"].includes(message.cleanContent.trim().toLowerCase())
  ) {
    if (!shouldTrigger()) return;
    await message.channel.send(message.cleanContent);
  }

  if (message.cleanContent.match(/\w+sus\w+/gi) !== null) {
    if (!shouldTrigger()) return;

    const word = message.cleanContent.match(/\w+sus\w+/gi)![0];
    await message.channel.send(`> ${word}\nsus`);
  }
};

const shouldTrigger = () => Math.random() <= TRIGGER_CHANCE;

const AutoreplyModule: Module = {
  commands: [],
  handlers: {
    messageCreate: [handleMessage],
  },
};

export default AutoreplyModule;
