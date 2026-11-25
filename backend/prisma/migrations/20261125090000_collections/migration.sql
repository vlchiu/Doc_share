CREATE TABLE "Collection" (
 "id" SERIAL PRIMARY KEY, "user_id" INTEGER NOT NULL,
 "name" VARCHAR(120) NOT NULL, "description" VARCHAR(2000) NOT NULL DEFAULT '',
 "visibility" VARCHAR(10) NOT NULL DEFAULT 'PRIVATE' CHECK ("visibility" IN ('PRIVATE','PUBLIC')),
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE "CollectionItem" (
 "collection_id" INTEGER NOT NULL, "document_id" INTEGER NOT NULL, "position" INTEGER NOT NULL,
 PRIMARY KEY ("collection_id", "document_id"),
 FOREIGN KEY ("collection_id") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE,
 FOREIGN KEY ("document_id") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Collection_user_id_updated_at_idx" ON "Collection"("user_id", "updated_at");
CREATE INDEX "CollectionItem_collection_id_position_idx" ON "CollectionItem"("collection_id", "position");
CREATE INDEX "CollectionItem_document_id_idx" ON "CollectionItem"("document_id");
