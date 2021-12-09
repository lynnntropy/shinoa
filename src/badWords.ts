import * as fs from "fs";
import * as path from "path";

const badWords = fs
  .readFileSync(path.join(__dirname, "../resources/bad-words.txt"), "utf8")
  .trim()
  .split("\n")
  .map((w) => w.trim())
  .filter((w) => w.length > 0);

export default badWords;
