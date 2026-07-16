PRAGMA foreign_keys=ON;

CREATE TABLE IF NOT EXISTS "CompanySettings" (
  "id" INTEGER NOT NULL PRIMARY KEY DEFAULT 1, "businessName" TEXT NOT NULL, "vatNumber" TEXT, "taxCode" TEXT,
  "address" TEXT, "streetNumber" TEXT, "postalCode" TEXT, "city" TEXT, "province" TEXT, "phone" TEXT, "email" TEXT, "pec" TEXT,
  "openingHours" TEXT, "logoPath" TEXT, "defaultSeller" TEXT, "defaultValidityDays" INTEGER NOT NULL DEFAULT 30,
  "defaultDeliveryTime" TEXT, "defaultPaymentMethodId" INTEGER, "defaultPaymentConditions" TEXT,
  "defaultVatRate" DECIMAL NOT NULL DEFAULT 22, "defaultTaxNote" TEXT, "standardNotes" TEXT,
  "quoteNumberFormat" TEXT NOT NULL DEFAULT 'PREV-{YYYY}-{NNNN}', "depositThresholdCents" INTEGER NOT NULL DEFAULT 299900,
  "defaultDepositPercent" DECIMAL NOT NULL DEFAULT 50, "maxUploadMb" INTEGER NOT NULL DEFAULT 20,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Customer" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "type" TEXT NOT NULL DEFAULT 'PRIVATO', "firstName" TEXT, "lastName" TEXT,
  "companyName" TEXT, "taxCode" TEXT, "vatNumber" TEXT, "recipientCode" TEXT, "pec" TEXT, "phone" TEXT, "email" TEXT,
  "notes" TEXT, "archived" BOOLEAN NOT NULL DEFAULT false, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "Customer_lastName_firstName_idx" ON "Customer"("lastName", "firstName");
CREATE INDEX IF NOT EXISTS "Customer_companyName_idx" ON "Customer"("companyName");
CREATE INDEX IF NOT EXISTS "Customer_taxCode_idx" ON "Customer"("taxCode");
CREATE INDEX IF NOT EXISTS "Customer_vatNumber_idx" ON "Customer"("vatNumber");

CREATE TABLE IF NOT EXISTS "CustomerAddress" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "customerId" INTEGER NOT NULL, "type" TEXT NOT NULL DEFAULT 'RESIDENZA',
  "address" TEXT, "streetNumber" TEXT, "postalCode" TEXT, "city" TEXT, "province" TEXT, "isDefault" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerAddress_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "CustomerAddress_customerId_type_idx" ON "CustomerAddress"("customerId", "type");
CREATE INDEX IF NOT EXISTS "CustomerAddress_city_idx" ON "CustomerAddress"("city");

CREATE TABLE IF NOT EXISTS "Category" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "slug" TEXT NOT NULL, "position" INTEGER NOT NULL DEFAULT 0,
  "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "Category_name_key" ON "Category"("name");
CREATE UNIQUE INDEX IF NOT EXISTS "Category_slug_key" ON "Category"("slug");

CREATE TABLE IF NOT EXISTS "Product" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "internalCode" TEXT NOT NULL, "name" TEXT NOT NULL, "categoryId" INTEGER NOT NULL,
  "subcategory" TEXT, "brand" TEXT, "model" TEXT, "description" TEXT, "power" TEXT, "capacity" TEXT, "unit" TEXT NOT NULL DEFAULT 'pz',
  "salePriceInclVatCents" INTEGER NOT NULL DEFAULT 0, "salePriceExclVatCents" INTEGER NOT NULL DEFAULT 0, "vatRate" DECIMAL NOT NULL DEFAULT 22,
  "purchaseCostCents" INTEGER NOT NULL DEFAULT 0, "supplier" TEXT, "internalNotes" TEXT, "quoteDescription" TEXT, "imagePath" TEXT,
  "technicalConfiguration" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Product_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Product_internalCode_key" ON "Product"("internalCode");

CREATE TABLE IF NOT EXISTS "ProductAttachment" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "productId" INTEGER NOT NULL, "originalName" TEXT NOT NULL, "storedName" TEXT NOT NULL,
  "path" TEXT NOT NULL, "mimeType" TEXT NOT NULL DEFAULT 'application/pdf', "sizeBytes" INTEGER NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductAttachment_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "ProductAttachment_storedName_key" ON "ProductAttachment"("storedName");
CREATE INDEX IF NOT EXISTS "ProductAttachment_productId_idx" ON "ProductAttachment"("productId");

CREATE TABLE IF NOT EXISTS "Service" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "categoryId" INTEGER, "description" TEXT,
  "defaultPriceCents" INTEGER NOT NULL DEFAULT 0, "vatRate" DECIMAL NOT NULL DEFAULT 22, "unit" TEXT NOT NULL DEFAULT 'corpo',
  "estimatedDuration" TEXT, "active" BOOLEAN NOT NULL DEFAULT true, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Service_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "Service_name_idx" ON "Service"("name");

CREATE TABLE IF NOT EXISTS "Quote" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "number" TEXT NOT NULL, "customerId" INTEGER NOT NULL, "categoryId" INTEGER,
  "status" TEXT NOT NULL DEFAULT 'BOZZA', "quoteDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "validityDays" INTEGER NOT NULL DEFAULT 30,
  "expiryDate" DATETIME NOT NULL, "seller" TEXT, "subject" TEXT, "deliveryTime" TEXT, "internalNotes" TEXT,
  "installationAddressSnapshot" TEXT, "customerSnapshot" TEXT NOT NULL, "categorySnapshot" TEXT, "technicalConfiguration" TEXT,
  "paymentMethod" TEXT, "paymentConditions" TEXT, "depositPercent" DECIMAL NOT NULL DEFAULT 0, "depositCents" INTEGER NOT NULL DEFAULT 0,
  "balancePercent" DECIMAL NOT NULL DEFAULT 100, "balanceCents" INTEGER NOT NULL DEFAULT 0, "financingAvailable" BOOLEAN NOT NULL DEFAULT false,
  "financingType" TEXT, "financingNotes" TEXT, "incentive" TEXT, "fiscalNote" TEXT, "visibleNotes" TEXT, "additionalConditions" TEXT,
  "subtotalCents" INTEGER NOT NULL DEFAULT 0, "discountCents" INTEGER NOT NULL DEFAULT 0, "vatCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0, "estimatedMarginCents" INTEGER NOT NULL DEFAULT 0, "attachmentMode" TEXT NOT NULL DEFAULT 'NESSUNO',
  "lastPdfPath" TEXT, "lastPdfGeneratedAt" DATETIME, "issuedAt" DATETIME, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Quote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Quote_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "Quote_number_key" ON "Quote"("number");
CREATE INDEX IF NOT EXISTS "Quote_status_idx" ON "Quote"("status");
CREATE INDEX IF NOT EXISTS "Quote_expiryDate_idx" ON "Quote"("expiryDate");
CREATE INDEX IF NOT EXISTS "Quote_quoteDate_idx" ON "Quote"("quoteDate");
CREATE INDEX IF NOT EXISTS "Quote_customerId_idx" ON "Quote"("customerId");

CREATE TABLE IF NOT EXISTS "QuoteItem" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "quoteId" INTEGER NOT NULL, "type" TEXT NOT NULL DEFAULT 'LIBERA', "productId" INTEGER,
  "serviceId" INTEGER, "position" INTEGER NOT NULL DEFAULT 0, "title" TEXT, "description" TEXT NOT NULL, "quantity" DECIMAL NOT NULL DEFAULT 1,
  "unit" TEXT NOT NULL DEFAULT 'pz', "unitPriceCents" INTEGER NOT NULL DEFAULT 0, "priceIncludesVat" BOOLEAN NOT NULL DEFAULT true,
  "discountPercent" DECIMAL NOT NULL DEFAULT 0, "discountFixedCents" INTEGER NOT NULL DEFAULT 0, "vatRate" DECIMAL NOT NULL DEFAULT 22,
  "subtotalCents" INTEGER NOT NULL DEFAULT 0, "discountCents" INTEGER NOT NULL DEFAULT 0, "vatCents" INTEGER NOT NULL DEFAULT 0,
  "totalCents" INTEGER NOT NULL DEFAULT 0, "purchaseCostCents" INTEGER NOT NULL DEFAULT 0, "productSnapshot" TEXT, "serviceSnapshot" TEXT,
  "configurationSnapshot" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuoteItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "QuoteItem_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE SET NULL ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "QuoteItem_quoteId_position_idx" ON "QuoteItem"("quoteId", "position");

CREATE TABLE IF NOT EXISTS "QuoteStatusHistory" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "quoteId" INTEGER NOT NULL, "fromStatus" TEXT, "toStatus" TEXT NOT NULL,
  "note" TEXT, "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteStatusHistory_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "QuoteStatusHistory_quoteId_changedAt_idx" ON "QuoteStatusHistory"("quoteId", "changedAt");

CREATE TABLE IF NOT EXISTS "QuoteReminder" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "quoteId" INTEGER NOT NULL, "dueAt" DATETIME NOT NULL, "postponedUntil" DATETIME,
  "contactedAt" DATETIME, "contactNotes" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteReminder_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX IF NOT EXISTS "QuoteReminder_dueAt_idx" ON "QuoteReminder"("dueAt");
CREATE INDEX IF NOT EXISTS "QuoteReminder_quoteId_idx" ON "QuoteReminder"("quoteId");

CREATE TABLE IF NOT EXISTS "QuoteAttachmentSelection" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "quoteId" INTEGER NOT NULL, "attachmentId" INTEGER NOT NULL,
  "selected" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "QuoteAttachmentSelection_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuoteAttachmentSelection_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "ProductAttachment"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX IF NOT EXISTS "QuoteAttachmentSelection_quoteId_attachmentId_key" ON "QuoteAttachmentSelection"("quoteId", "attachmentId");

CREATE TABLE IF NOT EXISTS "PaymentMethod" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "name" TEXT NOT NULL, "active" BOOLEAN NOT NULL DEFAULT true, "position" INTEGER NOT NULL DEFAULT 0,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "PaymentMethod_name_key" ON "PaymentMethod"("name");

CREATE TABLE IF NOT EXISTS "LegalDocument" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "type" TEXT NOT NULL, "title" TEXT NOT NULL, "content" TEXT NOT NULL,
  "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS "LegalDocument_type_key" ON "LegalDocument"("type");

CREATE TABLE IF NOT EXISTS "AppSetting" ("key" TEXT NOT NULL PRIMARY KEY, "value" TEXT NOT NULL, "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE IF NOT EXISTS "SystemLog" (
  "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT, "level" TEXT NOT NULL DEFAULT 'ERROR', "context" TEXT, "message" TEXT NOT NULL,
  "details" TEXT, "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "SystemLog_createdAt_idx" ON "SystemLog"("createdAt");
