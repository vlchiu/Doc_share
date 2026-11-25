CREATE TABLE "CollectionFollow" (
 "user_id" INTEGER NOT NULL,
 "collection_id" INTEGER NOT NULL,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 PRIMARY KEY ("user_id", "collection_id"),
 FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("collection_id") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "CollectionFollow_collection_id_idx" ON "CollectionFollow"("collection_id");
CREATE INDEX "CollectionFollow_user_id_created_at_idx" ON "CollectionFollow"("user_id", "created_at");
