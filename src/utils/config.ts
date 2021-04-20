export const getEnvironmentVariableOrThrow = (key: string) => {
  const value = process.env[key];

  if (value === undefined) {
    throw new Error(`Environment variable ${key} is required.`);
  }

  return value;
};
