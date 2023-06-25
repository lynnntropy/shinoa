import { EventHandler, Module } from "../internal/types";
import { PorterStemmer } from "natural";
import { Message } from "discord.js";
import badWords from "../badWords";
import emitter from "../emitter";
import { bold, hyperlink } from "@discordjs/builders";
import { mute } from "../mutes";
import logger from "../logger";
import { buildUsernameString } from "../utils/strings";

enum AutomodAction {
  Log,
  Warn,
  Mute,
  Delete,
}

interface AutomodRule {
  name: string;
  defaultActions: AutomodAction[];
  handle: (
    message: Message,
    tokens: string[]
  ) => Promise<AutomodAction[] | boolean>;
}

const rules: AutomodRule[] = [
  {
    name: "word filter",
    defaultActions: [AutomodAction.Log, AutomodAction.Warn],
    handle: async (_, tokens) => {
      const badWordsFound = badWords
        .filter(({ word }) => tokens.includes(word))
        .sort((a, b) => b.level - a.level);

      if (!badWordsFound.length) {
        return false;
      }

      if (badWordsFound[0].level === 1) {
        return [AutomodAction.Log, AutomodAction.Warn];
      }

      if (badWordsFound[0].level > 1) {
        return [AutomodAction.Log, AutomodAction.Delete, AutomodAction.Mute];
      }

      return false;
    },
  },
  {
    name: "@everyone / @here attempt",
    defaultActions: [AutomodAction.Log, AutomodAction.Mute],
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
    defaultActions: [AutomodAction.Log, AutomodAction.Mute],
    handle: async (message) => {
      const mentionCount =
        message.mentions.users.size + message.mentions.roles.size;
      return mentionCount >= 10;
    },
  },
  {
    name: "sus links",
    defaultActions: [AutomodAction.Log, AutomodAction.Mute],
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
    const ruleResult = await rule.handle(message, tokens);

    if (Array.isArray(ruleResult)) {
      actions.push(...ruleResult);
    } else if (ruleResult === true) {
      actions.push(...rule.defaultActions);
    }
  }

  actions = [...new Set(actions)];

  if (actions.includes(AutomodAction.Log)) {
    try {
      emitter.emit("logEvent", {
        guild: message.guild!,
        note:
          bold(buildUsernameString(message.author)) +
          `'s message tripped one or more of Shinoa's automod rules.\n\n` +
          `Message contents:\`\`\`${message.cleanContent}\`\`\`` +
          (!actions.includes(AutomodAction.Delete)
            ? "\n" + hyperlink("🔗 Link to message", message.url)
            : "\n" + "The message was deleted automatically."),
      });
    } catch (err) {
      logger.error(err);
    }
  }

  if (actions.includes(AutomodAction.Warn)) {
    try {
      await message.reply("Please watch your language.");
    } catch (err) {
      logger.error(err);
    }
  }

  if (actions.includes(AutomodAction.Mute)) {
    try {
      await mute({
        guild: message.guild!,
        member: message.member!,
        reason: "Automatic mute",
      });
    } catch (err) {
      logger.error(err);
    }
  }

  if (actions.includes(AutomodAction.Delete)) {
    try {
      await message.delete();
    } catch (err) {
      logger.error(err);
    }
  }
};

const AutomodModule: Module = {
  commands: [],
  handlers: {
    messageCreate: [handleMessageCreate],
  },
};

export default AutomodModule;
