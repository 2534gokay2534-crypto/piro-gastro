-- AlterTable
ALTER TABLE "Order" ADD COLUMN "paidMethod" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentRef" TEXT;
ALTER TABLE "Order" ADD COLUMN "provider" TEXT;
ALTER TABLE "Order" ADD COLUMN "providerRef" TEXT;

-- CreateTable
CREATE TABLE "InvoiceApplication" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "company" TEXT NOT NULL,
    "orgNr" TEXT NOT NULL,
    "vatNr" TEXT,
    "contact" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "billAddr" TEXT NOT NULL,
    "billZip" TEXT NOT NULL,
    "billCity" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'SE',
    "note" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "decidedBy" TEXT,
    "decidedAt" DATETIME,
    "decision" TEXT,
    "creditLimitCents" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "InvoiceApplication_status_createdAt_idx" ON "InvoiceApplication"("status", "createdAt");

-- CreateIndex
CREATE INDEX "InvoiceApplication_orgNr_idx" ON "InvoiceApplication"("orgNr");

-- CreateIndex
CREATE INDEX "InvoiceApplication_email_idx" ON "InvoiceApplication"("email");

-- CreateIndex
CREATE INDEX "Order_providerRef_idx" ON "Order"("providerRef");
