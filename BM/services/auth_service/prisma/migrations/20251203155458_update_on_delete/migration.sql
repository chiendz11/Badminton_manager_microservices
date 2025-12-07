-- DropForeignKey
ALTER TABLE "public"."ExternalIdentity" DROP CONSTRAINT "ExternalIdentity_userId_fkey";

-- AddForeignKey
ALTER TABLE "public"."ExternalIdentity" ADD CONSTRAINT "ExternalIdentity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
