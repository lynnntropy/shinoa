import prisma from "./prisma";

export const getKeyValueItem = async <T>(key: string): Promise<T | null> => {
  const kv = await prisma.keyValueItem.findUnique({
    where: { key },
  });

  return (kv?.value as unknown as T) ?? null;
};

export const setKeyValueItem = async (key: string, value: any) =>
  await prisma.keyValueItem.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
