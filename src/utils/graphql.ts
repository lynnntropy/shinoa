import { merge } from "lodash";

export const mergeResolverDefinitions = (definitions: any[]) => {
  return merge({}, ...definitions);
};
