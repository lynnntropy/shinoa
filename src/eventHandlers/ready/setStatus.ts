import client from "../../client";
import { EventHandler } from "../../internal/types";

const setStatus: EventHandler<"ready"> = async () => {
  client.user.setActivity("uwu", { type: "PLAYING" });
};

export default setStatus;
