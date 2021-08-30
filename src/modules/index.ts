import { flatten } from "lodash";
import { mergeResolverDefinitions } from "../utils/graphql";
import { mergeHandlerCollections } from "../utils/modules";
import BotAdministrationModule from "./BotAdministrationModule";
import FunModule from "./FunModule";
import MiscModule from "./MiscModule";
import ModerationModule from "./ModerationModule";
import QuotesModule from "./QuotesModule";

const modules = [
  FunModule,
  BotAdministrationModule,
  MiscModule,
  ModerationModule,
  QuotesModule,
];

export const commands = flatten(modules.map((m) => m.commands));
export const handlers = mergeHandlerCollections(modules.map((m) => m.handlers));
export const resolvers = mergeResolverDefinitions(
  modules.map((m) => m.resolvers ?? {})
);
