-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sku" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "subId" TEXT,
    "brandId" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "stock" INTEGER NOT NULL DEFAULT 0,
    "threshold" INTEGER NOT NULL DEFAULT 0,
    "onRequest" BOOLEAN NOT NULL DEFAULT false,
    "leadDays" INTEGER NOT NULL DEFAULT 5,
    "warranty" INTEGER NOT NULL DEFAULT 24,
    "hidden" BOOLEAN NOT NULL DEFAULT false,
    "featured" BOOLEAN NOT NULL DEFAULT false,
    "badge" TEXT,
    "campaignOn" BOOLEAN NOT NULL DEFAULT false,
    "campaignPercent" INTEGER NOT NULL DEFAULT 0,
    "sold" INTEGER NOT NULL DEFAULT 0,
    "sortRank" INTEGER NOT NULL DEFAULT 500,
    "costCents" INTEGER NOT NULL DEFAULT 0,
    "supplierId" TEXT,
    "dimW" INTEGER,
    "dimD" INTEGER,
    "dimH" INTEGER,
    "weightKg" REAL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Product_subId_fkey" FOREIGN KEY ("subId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Product_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "Brand" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Product" ("badge", "brandId", "campaignOn", "campaignPercent", "categoryId", "costCents", "createdAt", "currency", "dimD", "dimH", "dimW", "featured", "hidden", "id", "leadDays", "onRequest", "priceCents", "sku", "slug", "sold", "stock", "subId", "supplierId", "threshold", "updatedAt", "warranty", "weightKg") SELECT "badge", "brandId", "campaignOn", "campaignPercent", "categoryId", "costCents", "createdAt", "currency", "dimD", "dimH", "dimW", "featured", "hidden", "id", "leadDays", "onRequest", "priceCents", "sku", "slug", "sold", "stock", "subId", "supplierId", "threshold", "updatedAt", "warranty", "weightKg" FROM "Product";
DROP TABLE "Product";
ALTER TABLE "new_Product" RENAME TO "Product";
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");
CREATE INDEX "Product_subId_idx" ON "Product"("subId");
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");
CREATE INDEX "Product_hidden_idx" ON "Product"("hidden");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
