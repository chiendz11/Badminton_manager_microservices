/*
  Warnings:

  - Added the required column `authClientId` to the `RefreshToken` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."RefreshToken" ADD COLUMN     "authClientId" UUID NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."RefreshToken" ADD CONSTRAINT "RefreshToken_authClientId_fkey" FOREIGN KEY ("authClientId") REFERENCES "public"."AuthClient"("id") ON DELETE CASCADE ON UPDATE CASCADE;
