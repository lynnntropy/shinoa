import { ApolloServer } from "apollo-server";
import { readFileSync } from "fs";
import * as path from "path";
import { resolvers as moduleResolvers } from "../modules";
import { mergeResolverDefinitions } from "../utils/graphql";
import appResolvers from "./resolvers";

const typeDefs = readFileSync(path.join(__dirname, "schema.graphql")).toString(
  "utf-8"
);

const resolvers = mergeResolverDefinitions([appResolvers, moduleResolvers]);

export const server = new ApolloServer({ typeDefs, resolvers });
