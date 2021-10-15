import { flatten } from "lodash";
import emitter from "../emitter";
import { mergeResolverDefinitions } from "../utils/graphql";
import { mergeHandlerCollections } from "../utils/modules";
import BotAdministrationModule from "./BotAdministrationModule";
import FunModule from "./FunModule";
import LoggingModule from "./LoggingModule";
import MiscModule from "./MiscModule";
import ModerationModule from "./ModerationModule";
import QuotesModule from "./QuotesModule";

const modules = [
  FunModule,
  BotAdministrationModule,
  MiscModule,
  ModerationModule,
  QuotesModule,
  LoggingModule,
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
export const resolvers = mergeResolverDefinitions(
  modules.map((m) => m.resolvers ?? {})
);
