import client from "../../client";
import { EventHandler } from "../../types";

const setStatus: EventHandler<void> = async () => {
  // This is my own fault, right now we're listening to webhook events directly
  // so we have to use this hack to wait for the discord.js handler to execute first
  await new Promise((yay) => setTimeout(yay, 500));

  await client.user.setActivity("uwu", { type: "PLAYING" });
};

export default setStatus;
