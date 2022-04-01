-- DropForeignKey
ALTER TABLE "Vote" DROP CONSTRAINT "Vote_pollId_fkey";

-- CreateTable
CREATE TABLE "Sticker" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "url" TEXT NOT NULL,

    CONSTRAINT "Sticker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Sticker_guildId_tag_key" ON "Sticker"("guildId", "tag");

-- AddForeignKey
ALTER TABLE "Vote" ADD CONSTRAINT "Vote_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "Poll"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RenameIndex
ALTER INDEX "Poll.guildId_localId_unique" RENAME TO "Poll_guildId_localId_key";

-- RenameIndex
ALTER INDEX "Poll.messsageId_unique" RENAME TO "Poll_messsageId_key";

-- RenameIndex
ALTER INDEX "Quote.messageId_unique" RENAME TO "Quote_messageId_key";

-- RenameIndex
ALTER INDEX "StarboardItem.messageId_unique" RENAME TO "StarboardItem_messageId_key";

-- RenameIndex
ALTER INDEX "Vote.pollId_userId_unique" RENAME TO "Vote_pollId_userId_key";
