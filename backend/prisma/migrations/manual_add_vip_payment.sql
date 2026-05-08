-- Email verify fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "is_email_verified" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email_verify_token" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email_verify_expires" TIMESTAMP(3);
-- Password reset fields
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reset_token" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "reset_token_expires" TIMESTAMP(3);
-- VIP fields
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Plan') THEN
    CREATE TYPE "Plan" AS ENUM ('FREE', 'VIP');
  END IF;
END $$;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan" "Plan" NOT NULL DEFAULT 'FREE';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "plan_expires_at" TIMESTAMP(3);
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "monthly_downloads" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "download_reset_at" TIMESTAMP(3);

-- Payment table
CREATE TABLE IF NOT EXISTS "Payment" (
  "id" SERIAL PRIMARY KEY,
  "order_id" TEXT UNIQUE NOT NULL,
  "amount" INTEGER NOT NULL,
  "plan_months" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "provider" TEXT NOT NULL,
  "provider_ref" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "user_id" INTEGER NOT NULL REFERENCES "User"("id")
);
