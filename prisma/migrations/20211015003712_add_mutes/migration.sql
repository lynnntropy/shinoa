-- CreateTable
CREATE TABLE "Mute" (
    "id" SERIAL NOT NULL,
    "guildId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "endsAt" TIMESTAMP(3) NOT NULL,

    PRIMARY KEY ("id")
);
