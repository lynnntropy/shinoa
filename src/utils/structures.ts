import { Message } from "discord.js";
import { SerializableMessage } from "../internal/types";

export const buildSerializableMessage = (
  message: Message
): SerializableMessage => ({
  id: message.id,
  attachments: message.attachments.map((a) => ({ id: a.id, url: a.url })),
  author: {
    id: message.author.id,
    avatar: message.author.avatar,
    discriminator: message.author.discriminator,
    username: message.author.username,
  },
  channel: {
    id: message.channel.id,
  },
  content: message.content,
  createdAt: message.createdAt,
  guild: {
    id: message.guild.id,
    name: message.guild.name,
  },
  member: {
    nickname: message.member.nickname,
  },
});
