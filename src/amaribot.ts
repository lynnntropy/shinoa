import { AmariBot } from "amaribot.js";
import environment from "./environment";

const amariBot = new AmariBot(environment.AMARI_BOT_API_TOKEN, {
  token: environment.AMARI_BOT_API_TOKEN,
});

export default amariBot;
