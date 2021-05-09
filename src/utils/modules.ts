import { isArray, merge, mergeWith } from "lodash";
import { HandlerCollection, Module } from "../internal/types";

export const mergeModules = (modules: Module[]): Module => {
  return mergeWith({}, ...modules, (objValue, srcValue) => {
    if (isArray(objValue)) {
      return objValue.concat(srcValue);
    }
  });
};

export const mergeHandlerCollections = (
  handlers: HandlerCollection[]
): HandlerCollection => {
  return merge({}, ...handlers);
};
