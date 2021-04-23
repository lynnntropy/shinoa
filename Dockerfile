FROM node:14-alpine

WORKDIR /usr/src/app

COPY package.json .
COPY yarn.lock .
RUN yarn install

COPY . .

RUN yarn build

ENV NODE_OPTIONS=--unhandled-rejections=throw
ENV LOG_LEVEL=info

ENTRYPOINT ["docker/entrypoint.sh"]

CMD node dist/index.js