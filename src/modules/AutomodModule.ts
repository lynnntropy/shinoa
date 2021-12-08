import { EventHandler, Module } from "../internal/types";
import { PorterStemmer } from "natural";
import { Message } from "discord.js";
import badWords from "../badWords";
import emitter from "../emitter";
import { bold, hyperlink } from "@discordjs/builders";
import { mute } from "../mutes";

enum AutomodAction {
  Log,
  Warn,
  Mute,
  Delete,
}

interface AutomodRule {
  name: string;
  actions: AutomodAction[];
  handle: (message: Message, tokens: string[]) => Promise<boolean>;
}

const rules: AutomodRule[] = [
  {
    name: "word filter",
    actions: [AutomodAction.Log, AutomodAction.Warn],
    handle: async (_, tokens) =>
      tokens.some((token) => badWords.includes(token)),
  },
  {
    name: "@everyone / @here attempt",
    actions: [AutomodAction.Log, AutomodAction.Mute],
    handle: async (message) => {
      if (
        message.cleanContent.includes("@everyone") ||
        message.cleanContent.includes("@here")
      ) {
        if (!message.mentions.everyone) {
          return true;
        }
      }

      return false;
    },
  },
  {
    name: "ping spam",
    actions: [AutomodAction.Log, AutomodAction.Mute],
    handle: async (message) => {
      const mentionCount =
        message.mentions.users.size + message.mentions.roles.size;
      return mentionCount >= 10;
    },
  },
  {
    name: "sus links",
    actions: [AutomodAction.Log, AutomodAction.Mute],
    handle: async (message) => {
      const urls = message.cleanContent.match(/\bhttps?:\/\/\S+/gi);
      return (
        urls?.some(
          (url) =>
            url.toLowerCase().includes("discord") &&
            url.toLowerCase().includes("gift")
        ) ?? false
      );
    },
  },
];

const handleMessageCreate: EventHandler<"messageCreate"> = async (message) => {
  if (!message.guildId) {
    return;
  }

  const tokens = PorterStemmer.tokenizeAndStem(message.cleanContent);

  let actions: AutomodAction[] = [];

  for (const rule of rules) {
    const hit = await rule.handle(message, tokens);
    if (hit) {
      actions.push(...rule.actions);
    }
  }

  actions = [...new Set(actions)];

  if (actions.includes(AutomodAction.Log)) {
    emitter.emit("logEvent", {
      guild: message.guild!,
      note:
        bold(message.author.tag) +
        `'s message tripped one or more of Shinoa's automod rules.\n\n` +
        hyperlink("🔗 Link to message", message.url),
    });
  }

  if (actions.includes(AutomodAction.Warn)) {
    await message.reply("Please watch your language.");
  }

  if (actions.includes(AutomodAction.Mute)) {
    await mute({
      guild: message.guild!,
      member: message.member!,
      reason: "Automatic mute",
    });
  }

  if (actions.includes(AutomodAction.Delete)) {
    await message.delete();
  }
};

const AutomodModule: Module = {
  commands: [],
  handlers: {
    messageCreate: [handleMessageCreate],
  },
};

export default AutomodModule;
