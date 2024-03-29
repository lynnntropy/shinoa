import { flatten } from "lodash";
import emitter from "../emitter";
import { mergeHandlerCollections } from "../utils/modules";
import BotAdministrationModule from "./BotAdministrationModule";
import FunModule from "./FunModule";
import LoggingModule from "./LoggingModule";
import MiscModule from "./MiscModule";
import ModerationModule from "./ModerationModule";
import QuotesModule from "./QuotesModule";
import JoinLeaveMessagesModule from "./JoinLeaveMessagesModule";
import SauceNAOModule from "./SauceNAOModule";
import PollModule from "./PollModule";
import StarboardModule from "./StarboardModule";
import AutomodModule from "./AutomodModule";
import RolesModule from "./RolesModule";
import StickersModule from "./StickersModule";
import MemberCounterModule from "./MemberCounterModule";
import WelcomeDMsModule from "./WelcomeDMsModule";
import ClubsModule from "./ClubsModule";

const modules = [
  FunModule,
  BotAdministrationModule,
  MiscModule,
  ModerationModule,
  QuotesModule,
  LoggingModule,
  JoinLeaveMessagesModule,
  SauceNAOModule,
  PollModule,
  StarboardModule,
  AutomodModule,
  RolesModule,
  StickersModule,
  MemberCounterModule,
  WelcomeDMsModule,
  ClubsModule,
];

for (const module of modules) {
  if (!module.appEventHandlers) {
    continue;
  }

  for (const eventHandler of module.appEventHandlers) {
    emitter.on(eventHandler[0], eventHandler[1]);
  }
}

for (const module of modules) {
  if (!module.cronJobs) {
    continue;
  }

  for (const cronJob of module.cronJobs) {
    cronJob.start();
  }
}

export const commands = flatten(modules.map((m) => m.commands));
export const handlers = mergeHandlerCollections(modules.map((m) => m.handlers));
