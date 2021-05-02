import { HandlerCollection, Module } from "../types";
import { isArray, merge, mergeWith } from "lodash";

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
