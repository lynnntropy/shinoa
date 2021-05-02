import { HandlerCollection, Module } from "../types";
import { merge } from "lodash";

export const mergeModules = (modules: Module[]): Module => {
  return merge({}, ...modules);
};

export const mergeHandlerCollections = (
  handlers: HandlerCollection[]
): HandlerCollection => {
  return merge({}, ...handlers);
};
