ALTER TABLE "DownloadHistory" ADD COLUMN "delivery_key" TEXT,
  ADD COLUMN "content_version" INTEGER;
CREATE UNIQUE INDEX "DownloadHistory_delivery_key_key" ON "DownloadHistory"("delivery_key");
