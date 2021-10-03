import prisma from "./prisma";

export const getKeyValueItem = async <T>(key: string): Promise<T | null> => {
  const { value } = await prisma.keyValueItem.findUnique({
    where: { key },
  });

  return value as unknown as T;
};

export const setKeyValueItem = async (key: string, value: any) =>
  await prisma.keyValueItem.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
