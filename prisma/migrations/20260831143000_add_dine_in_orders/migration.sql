CREATE TABLE "DiningTable" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "code" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4 CHECK ("capacity" BETWEEN 1 AND 30),
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK ("status" IN ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'INACTIVE')),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "CustomerOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "publicId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'DINE_IN' CHECK ("mode" = 'DINE_IN'),
    "status" TEXT NOT NULL DEFAULT 'RECEIVED' CHECK ("status" IN ('RECEIVED', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED')),
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING' CHECK ("paymentStatus" IN ('PENDING', 'PAID')),
    "paymentMethod" TEXT,
    "subtotalCents" INTEGER NOT NULL CHECK ("subtotalCents" >= 0),
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 0 CHECK ("serviceFeeCents" >= 0),
    "totalCents" INTEGER NOT NULL CHECK ("totalCents" >= 0),
    "notes" TEXT NOT NULL DEFAULT '',
    "diningTableId" TEXT,
    "updatedAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CustomerOrder_diningTableId_fkey" FOREIGN KEY ("diningTableId") REFERENCES "DiningTable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" INTEGER NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL CHECK ("quantity" BETWEEN 1 AND 20),
    "basePriceCents" INTEGER NOT NULL CHECK ("basePriceCents" >= 0),
    "extraPriceCents" INTEGER NOT NULL DEFAULT 0 CHECK ("extraPriceCents" >= 0),
    "unitPriceCents" INTEGER NOT NULL CHECK ("unitPriceCents" >= 0),
    "lineTotalCents" INTEGER NOT NULL CHECK ("lineTotalCents" >= 0),
    "customization" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "orderId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OrderStatusHistory_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "DiningTable_code_key" ON "DiningTable"("code");
CREATE UNIQUE INDEX "DiningTable_number_key" ON "DiningTable"("number");
CREATE INDEX "DiningTable_isActive_status_number_idx" ON "DiningTable"("isActive", "status", "number");
CREATE UNIQUE INDEX "CustomerOrder_publicId_key" ON "CustomerOrder"("publicId");
CREATE UNIQUE INDEX "CustomerOrder_clientRequestId_key" ON "CustomerOrder"("clientRequestId");
CREATE INDEX "CustomerOrder_status_createdAt_idx" ON "CustomerOrder"("status", "createdAt");
CREATE INDEX "CustomerOrder_diningTableId_status_idx" ON "CustomerOrder"("diningTableId", "status");
CREATE INDEX "OrderItem_orderId_idx" ON "OrderItem"("orderId");
CREATE INDEX "OrderItem_productId_idx" ON "OrderItem"("productId");
CREATE INDEX "OrderStatusHistory_orderId_createdAt_idx" ON "OrderStatusHistory"("orderId", "createdAt");
