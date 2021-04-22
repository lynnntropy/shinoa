import { Client, WSEventType } from "discord.js";
import handlers from "./eventHandlers";

const client = new Client();

for (const event in handlers) {
  for (const handler of handlers[event]) {
    client.ws.on(event as WSEventType, handler);
  }
}

export default client;
