import { ApolloServer } from "apollo-server";
import { readFileSync } from "fs";
import * as path from "path";
import { resolvers } from "../modules";

const typeDefs = readFileSync(path.join(__dirname, "schema.graphql")).toString(
  "utf-8"
);

export const server = new ApolloServer({ typeDefs, resolvers });
