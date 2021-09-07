import { Guild } from "discord.js";
import { GraphQLFieldResolver } from "graphql";
import { IResolvers } from "graphql-tools";
import client from "../client";

interface AppResolvers extends IResolvers {
  Query: {
    guilds: GraphQLFieldResolver<any, any>;
    guild: GraphQLFieldResolver<any, any, { id: string }>;
  };
  Guild: {
    members: GraphQLFieldResolver<Guild, any, { query: string; limit: number }>;
  };
}

const resolvers: AppResolvers = {
  Query: {
    guilds: () => [...client.guilds.cache.values()],
    guild: async (_, args) => await client.guilds.fetch(args.id),
  },
  Guild: {
    members: async (parent, args) => [
      ...(
        await parent.members.search({ query: args.query, limit: args.limit })
      ).values(),
    ],
  },
};

export default resolvers;
