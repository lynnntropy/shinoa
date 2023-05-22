export type BAD_WORD_LEVEL = 1 | 2;

export type BadWord = {
  word: string;
  level: BAD_WORD_LEVEL;
};

const badWords: BadWord[] = [
  { word: "nigga", level: 2 },
  { word: "nigger", level: 2 },
  { word: "whore", level: 1 },
  { word: "coon", level: 1 },
  { word: "fag", level: 2 },
  { word: "faggot", level: 2 },
  { word: "jap", level: 1 },
  { word: "paki", level: 1 },
  { word: "raghead", level: 1 },
  { word: "towelhead", level: 1 },
  { word: "tranni", level: 2 },
];

export default badWords;
