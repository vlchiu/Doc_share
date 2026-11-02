ALTER TABLE "Document" ADD COLUMN "file_size" INTEGER;
CREATE TABLE "UsageReservation" (
 "id" TEXT PRIMARY KEY,
 "user_id" INTEGER NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
 "kind" TEXT NOT NULL,
 "day" TEXT NOT NULL,
 "amount" INTEGER NOT NULL,
 "completed" BOOLEAN NOT NULL DEFAULT false,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "UsageReservation_user_id_kind_day_idx" ON "UsageReservation"("user_id", "kind", "day");
