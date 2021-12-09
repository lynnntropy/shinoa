import { Guild, GuildMember } from "discord.js";
import { TypedEmitter } from "tiny-typed-emitter";

interface AppEvents {
  moderationEvent: (event: ModerationEvent) => void;
  logEvent: (event: LogEvent) => void;
}

export interface ModerationEvent {
  type: ModerationEventType;
  guild: Guild;
  note?: string;
  target?: GuildMember;
  moderator?: GuildMember;
  reason?: string;
}

export enum ModerationEventType {
  BAN,
  KICK,
  MUTE,
  UNMUTE,
  BLACKLIST,
  UNBLACKLIST,
  DUNGEON,
  UNDUNGEON,
}

export interface LogEvent {
  guild: Guild;
  note: string;
}

const emitter = new TypedEmitter<AppEvents>();

export type AppEventHandler = Parameters<typeof emitter.on>;

export default emitter;
