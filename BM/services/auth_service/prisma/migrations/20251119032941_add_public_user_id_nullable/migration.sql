/*
  Warnings:

  - A unique constraint covering the columns `[publicUserId]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "public"."User" ADD COLUMN     "publicUserId" VARCHAR(50);

-- CreateIndex
CREATE UNIQUE INDEX "User_publicUserId_key" ON "public"."User"("publicUserId");
