import { formatDuration, intervalToDuration } from "date-fns";
import { SlashCommandBuilder } from "discord.js";
import { Module } from "../core.ts";
import process from "node:process";

export const MiscModule: Module = {
  slashCommands: [
    {
      signature: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Pong!"),

      run: async (interaction) => {
        await interaction.reply("Pong!");
      },
    },

    {
      signature: new SlashCommandBuilder()
        .setName("pong")
        .setDescription("Ping!"),

      run: async (interaction) => {
        await interaction.reply("Ping!");
      },
    },

    {
      signature: new SlashCommandBuilder()
        .setName("stats")
        .setDescription("Get some stats on the current instance of the bot."),

      run: async (interaction) => {
        const output: string[] = [];

        output.push(`Running as PID ${Deno.pid} on host ${Deno.hostname()}`);
        output.push("");

        output.push("[General]");
        output.push(
          `Uptime: ${
            formatDuration(
              intervalToDuration({
                start: 0,
                end: Number(process.uptime().toFixed(1)) * 1000,
              }),
            )
          }`,
        );

        const memoryUsage = Deno.memoryUsage();

        output.push(
          `Memory usage (RSS): ${
            (memoryUsage.rss / 1024 / 1024).toFixed(2)
          } MB`,
        );

        output.push("");
        output.push("[System]");

        const systemMemoryInfo = Deno.systemMemoryInfo();
        const loadAvg = Deno.loadavg();

        output.push(
          `System memory (total): ` +
            (systemMemoryInfo.total / 1024 / 1024).toFixed(2) +
            ` MB`,
        );
        output.push(
          `System memory (available): ${
            (systemMemoryInfo.available / 1024 / 1024).toFixed(2)
          } MB`,
        );
        output.push(
          `1-minute load average: ${loadAvg[0].toFixed(2)}`,
        );
        output.push(
          `5-minute load average: ${loadAvg[1].toFixed(2)}`,
        );
        output.push(
          `15-minute load average: ${loadAvg[2].toFixed(2)}`,
        );

        output.push("");

        await interaction.reply(`\`\`\`${output.join("\n")}\`\`\``);
      },
    },
  ],
};
