/*
  Warnings:

  - You are about to drop the `ServiceClient` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE "public"."ServiceClient";

-- CreateTable
CREATE TABLE "public"."AuthClient" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "clientId" TEXT NOT NULL,
    "clientSecret" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "allowedRoles" "public"."Role"[] DEFAULT ARRAY[]::"public"."Role"[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AuthClient_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AuthClient_name_key" ON "public"."AuthClient"("name");

-- CreateIndex
CREATE UNIQUE INDEX "AuthClient_clientId_key" ON "public"."AuthClient"("clientId");
