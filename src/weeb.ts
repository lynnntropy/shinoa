import axios from "axios";
import environment from "./environment";

type FileType = "jpeg" | "png" | "gif";

interface ImageObject {
  id: string;
  type: string;
  baseType: string;
  fileType: FileType;
  mimeType: string;
  tags: string[];
  url: string;
  account: string;
}

const endpoints = {
  IMAGE_TYPES: "/images/types",
  RANDOM_IMAGE: "/images/random",
};

const client = axios.create({
  baseURL: "https://api.weeb.sh",
  headers: {
    Authorization: `Wolke ${environment.WEEB_SH_API_KEY}`,
  },
});

interface GetImageTypesResponse {
  types: string[];
}

export const getImageTypes = async (): Promise<string[]> => {
  const {
    data: { types },
  } = await client.get<GetImageTypesResponse>(endpoints.IMAGE_TYPES);
  return types;
};

interface GetRandomImageOptions {
  type?: string;
  tags?: string[];
  fileType?: FileType;
}

export const getRandomImage = async (
  options: GetRandomImageOptions
): Promise<ImageObject> => {
  const { data } = await client.get<ImageObject>(endpoints.RANDOM_IMAGE, {
    params: {
      type: options.type,
      tags: options.tags?.join(","),
      filetype: options.fileType,
    },
  });

  return data;
};
