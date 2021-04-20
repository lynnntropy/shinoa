import ConfigItem from "../database/models/ConfigItem.ts";

export const getDynamicConfigItem = async (
  key: string
): Promise<string | undefined> => {
  return (await ConfigItem.find(key))?.value as string;
};

export const setDynamicConfigItem = async (key: string, value: string) => {
  const item: ConfigItem = (await ConfigItem.find(key)) ?? new ConfigItem();
  item.key = key;
  item.value = value;
  await item.save();
};

export const readConfig = async (): Promise<{ [key: string]: string }> => {
  const items = (await ConfigItem.all()) as ConfigItem[];
  const config: { [key: string]: string } = {};

  for (const item of items) {
    if (typeof item.value !== "string") {
      continue;
    }
    config[item.key as string] = item.value;
  }

  return config;
};
