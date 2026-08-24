-- CreateTable
CREATE TABLE "Language" (
    "code" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "locale" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "rate" REAL NOT NULL DEFAULT 1,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "sourceCode" TEXT NOT NULL DEFAULT 'en',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "icon" TEXT,
    "sort" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "CategoryText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "categoryId" TEXT NOT NULL,
    "langCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'manual',
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CategoryText_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "CategoryText_langCode_fkey" FOREIGN KEY ("langCode") REFERENCES "Language" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Brand" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "country" TEXT
);

-- CreateTable
CREATE TABLE "Product" (
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

-- CreateTable
CREATE TABLE "ProductText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "langCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "desc" TEXT,
    "origin" TEXT NOT NULL DEFAULT 'machine',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "translatedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProductText_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProductText_langCode_fkey" FOREIGN KEY ("langCode") REFERENCES "Language" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "ProductImage" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ProductImage_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Spec" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "productId" TEXT NOT NULL,
    "sort" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Spec_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SpecText" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "specId" TEXT NOT NULL,
    "langCode" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "origin" TEXT NOT NULL DEFAULT 'machine',
    "locked" BOOLEAN NOT NULL DEFAULT false,
    "translatedAt" DATETIME,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SpecText_specId_fkey" FOREIGN KEY ("specId") REFERENCES "Spec" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "SpecText_langCode_fkey" FOREIGN KEY ("langCode") REFERENCES "Language" ("code") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TranslationCache" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "hash" TEXT NOT NULL,
    "fromCode" TEXT NOT NULL,
    "toCode" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "target" TEXT NOT NULL,
    "provider" TEXT NOT NULL DEFAULT 'deepl',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "TranslationRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "langCode" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "items" INTEGER NOT NULL DEFAULT 0,
    "chars" INTEGER NOT NULL DEFAULT 0,
    "cacheHits" INTEGER NOT NULL DEFAULT 0,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" DATETIME,
    "note" TEXT
);

-- CreateTable
CREATE TABLE "Setting" (
    "key" TEXT NOT NULL PRIMARY KEY,
    "value" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "actor" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE UNIQUE INDEX "Category_slug_key" ON "Category"("slug");

-- CreateIndex
CREATE INDEX "Category_parentId_idx" ON "Category"("parentId");

-- CreateIndex
CREATE INDEX "Category_sort_idx" ON "Category"("sort");

-- CreateIndex
CREATE INDEX "CategoryText_langCode_idx" ON "CategoryText"("langCode");

-- CreateIndex
CREATE UNIQUE INDEX "CategoryText_categoryId_langCode_key" ON "CategoryText"("categoryId", "langCode");

-- CreateIndex
CREATE UNIQUE INDEX "Brand_slug_key" ON "Brand"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "Product_slug_key" ON "Product"("slug");

-- CreateIndex
CREATE INDEX "Product_categoryId_idx" ON "Product"("categoryId");

-- CreateIndex
CREATE INDEX "Product_subId_idx" ON "Product"("subId");

-- CreateIndex
CREATE INDEX "Product_brandId_idx" ON "Product"("brandId");

-- CreateIndex
CREATE INDEX "Product_hidden_idx" ON "Product"("hidden");

-- CreateIndex
CREATE INDEX "ProductText_langCode_idx" ON "ProductText"("langCode");

-- CreateIndex
CREATE INDEX "ProductText_origin_idx" ON "ProductText"("origin");

-- CreateIndex
CREATE UNIQUE INDEX "ProductText_productId_langCode_key" ON "ProductText"("productId", "langCode");

-- CreateIndex
CREATE INDEX "ProductImage_productId_idx" ON "ProductImage"("productId");

-- CreateIndex
CREATE INDEX "Spec_productId_idx" ON "Spec"("productId");

-- CreateIndex
CREATE INDEX "SpecText_langCode_idx" ON "SpecText"("langCode");

-- CreateIndex
CREATE UNIQUE INDEX "SpecText_specId_langCode_key" ON "SpecText"("specId", "langCode");

-- CreateIndex
CREATE INDEX "TranslationCache_toCode_idx" ON "TranslationCache"("toCode");

-- CreateIndex
CREATE UNIQUE INDEX "TranslationCache_hash_fromCode_toCode_key" ON "TranslationCache"("hash", "fromCode", "toCode");

-- CreateIndex
CREATE INDEX "AuditLog_createdAt_idx" ON "AuditLog"("createdAt");
