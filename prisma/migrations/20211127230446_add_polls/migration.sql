-- CreateTable
CREATE TABLE "Poll" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "localId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "messsageId" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "options" JSONB NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vote" (
    "id" SERIAL NOT NULL,
    "pollId" INTEGER NOT NULL,
    "userId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Poll.messsageId_unique" ON "Poll"("messsageId");

-- CreateIndex
CREATE UNIQUE INDEX "Poll.guildId_localId_unique" ON "Poll"("guildId", "localId");

-- CreateIndex
CREATE UNIQUE INDEX "Vote.pollId_userId_unique" ON "Vote"("pollId", "userId");

-- AddForeignKey
ALTER TABLE "Vote" ADD FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE CASCADE ON UPDATE CASCADE;
