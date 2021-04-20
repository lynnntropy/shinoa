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
