/*
  Warnings:

  - You are about to drop the column `value` on the `Vote` table. All the data in the column will be lost.
  - Added the required column `minValues` to the `Poll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `maxValues` to the `Poll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `allowChangingVote` to the `Poll` table without a default value. This is not possible if the table is not empty.
  - Added the required column `showResults` to the `Poll` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Poll" ADD COLUMN     "minValues" INTEGER NOT NULL,
ADD COLUMN     "maxValues" INTEGER NOT NULL,
ADD COLUMN     "allowChangingVote" BOOLEAN NOT NULL,
ADD COLUMN     "showResults" BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE "Vote" DROP COLUMN "value",
ADD COLUMN     "values" TEXT[];
