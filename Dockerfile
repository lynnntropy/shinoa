FROM hayd/alpine-deno:1.9.0

EXPOSE 80

WORKDIR /app

USER deno

# TODO
# COPY deps.ts .
# RUN deno cache deps.ts

ADD . .
RUN deno cache src/main.ts

CMD ["run", "--allow-net=discord.com", "src/main.ts"]