import { ActivityType } from "discord.js";
import client from "../../client";
import { EventHandler } from "../../internal/types";
import logger from "../../logger";

const setStatus: EventHandler<"ready"> = async () => {
  if (client.user === null) {
    logger.error("Failed to set status: `client.user` is `null`");
    return;
  }

  client.user.setActivity("uwu", { type: ActivityType.Playing });
};

export default setStatus;
