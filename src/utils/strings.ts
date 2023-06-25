export const isValidHttpUrl = (input: string) => {
  let url;

  try {
    url = new URL(input);
  } catch {
    return false;
  }

  return url.protocol === "http:" || url.protocol === "https:";
};

export const buildUsernameString = (
  input: {
    username: string;
    discriminator: string;
    globalName?: string | null;
  } | null
) => {
  if (input === null) {
    return "(unknown)";
  }

  if (input.discriminator === "0") {
    if (input.globalName) {
      return `${input.globalName} (${input.username})`;
    }

    return input.username;
  }

  return `${input.username}#${input.discriminator}`;
};
