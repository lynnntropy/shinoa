import * as os from "os";
import { Client1_13 as Client } from "kubernetes-client";
import { formatDuration, intervalToDuration } from "date-fns";
import { CommandInteraction } from "discord.js";
import { Command } from "../internal/command";
import { Module } from "../internal/types";

class PingCommand extends Command {
  name = "ping";
  description = "Pong!";

  async handle(interaction: CommandInteraction) {
    await interaction.reply("Pong!");
  }
}

class PongCommand extends Command {
  name = "pong";
  description = "Ping!";

  async handle(interaction: CommandInteraction) {
    await interaction.reply("Ping!");
  }
}

class InfoCommand extends Command {
  name = "stats";
  description = "Get some stats on the current instance of the bot.";

  async handle(interaction: CommandInteraction) {
    let output: string[] = [];

    output.push(`Running as PID ${process.pid} on host ${os.hostname()}`);
    output.push("");

    output.push("[General]");
    output.push(
      `Uptime: ${formatDuration(
        intervalToDuration({
          start: 0,
          end: Number(process.uptime().toFixed(1)) * 1000,
        })
      )}`
    );

    output.push(
      `Memory usage (RSS): ${(process.memoryUsage().rss / 1024 / 1024).toFixed(
        2
      )}MB`
    );

    output.push("");

    try {
      const k8sClient = new Client({ version: "1.20" });
      const nodes = await k8sClient.api.v1.nodes.get();
      const master = nodes.body.items.find(
        (n: any) =>
          n.metadata.labels["node-role.kubernetes.io/master"] === "true"
      );
      const host = master.metadata.labels["kubernetes.io/hostname"];
      const os = master.metadata.labels["kubernetes.io/os"];
      const kernelVersion = master.status.nodeInfo.kernelVersion;
      const kubeletVersion = master.status.nodeInfo.kubeletVersion;

      output.push("[Kubernetes]");
      output.push(`Master node: ${host}`);
      output.push(`OS: ${os}`);
      output.push(`Kernel version: ${kernelVersion}`);
      output.push(`Kubelet version: ${kubeletVersion}`);
    } catch {
      // not running in k8s
    }

    await interaction.reply(`\`\`\`${output.join("\n")}\`\`\``);
  }
}

const MiscModule: Module = {
  commands: [new PingCommand(), new PongCommand(), new InfoCommand()],
  handlers: {},
};

export default MiscModule;
