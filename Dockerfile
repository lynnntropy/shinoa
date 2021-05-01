FROM node:14-alpine

WORKDIR /usr/src/app

COPY package.json .
COPY yarn.lock .
RUN yarn install

COPY . .

RUN yarn build
RUN yarn prisma generate

ENV NODE_OPTIONS=--unhandled-rejections=throw
ENV LOG_LEVEL=info

RUN chmod +x .infra/docker/entrypoint.sh

ENTRYPOINT [".infra/docker/entrypoint.sh"]

CMD node dist/index.js