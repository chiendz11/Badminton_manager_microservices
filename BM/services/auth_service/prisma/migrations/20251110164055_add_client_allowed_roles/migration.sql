-- AlterTable
ALTER TABLE "public"."ServiceClient" ADD COLUMN     "allowedRoles" "public"."Role"[] DEFAULT ARRAY[]::"public"."Role"[];
