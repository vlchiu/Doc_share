ALTER TABLE "User" ADD COLUMN "token_version" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "email_verify_attempts" INTEGER NOT NULL DEFAULT 0;

-- Old JWTs lack tokenVersion and must sign in again. Remove credentials that
-- could have been assigned through registration to an unverified Google user.
UPDATE "User" SET "password" = NULL, "reset_token" = NULL,
  "reset_token_expires" = NULL, "email_verify_token" = NULL,
  "email_verify_expires" = NULL
WHERE "google_id" IS NOT NULL AND "is_email_verified" = false;
-- These accounts become verified on their next verified Google sign-in.

ALTER TABLE "Document" ADD COLUMN "removed_by_admin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "content_version" INTEGER NOT NULL DEFAULT 1;
UPDATE "Document" SET "removed_by_admin" = true
WHERE "deleted_at" IS NOT NULL AND EXISTS (
  SELECT 1 FROM "Report" WHERE "Report"."document_id" = "Document"."id"
  AND "Report"."action" = 'REMOVE' AND "Report"."status" = 'RESOLVED'
);

CREATE TABLE "SepayReceipt" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "order_ref" TEXT,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL,
  "reason" TEXT,
  "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
