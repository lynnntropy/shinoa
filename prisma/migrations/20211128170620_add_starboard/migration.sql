-- CreateTable
CREATE TABLE "StarboardItem" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "starboardMessageId" TEXT NOT NULL,

    PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StarboardItem.messageId_unique" ON "StarboardItem"("messageId");
