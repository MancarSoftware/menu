CREATE TABLE "DiningTable" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "capacity" INTEGER NOT NULL DEFAULT 4,
    "status" TEXT NOT NULL DEFAULT 'AVAILABLE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DiningTable_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DiningTable_number_check" CHECK ("number" > 0),
    CONSTRAINT "DiningTable_capacity_check" CHECK ("capacity" BETWEEN 1 AND 30),
    CONSTRAINT "DiningTable_status_check" CHECK ("status" IN ('AVAILABLE', 'OCCUPIED', 'CLEANING', 'INACTIVE'))
);

CREATE TABLE "CustomerOrder" (
    "id" SERIAL NOT NULL,
    "publicId" TEXT NOT NULL,
    "clientRequestId" TEXT NOT NULL,
    "mode" TEXT NOT NULL DEFAULT 'DINE_IN',
    "status" TEXT NOT NULL DEFAULT 'RECEIVED',
    "paymentStatus" TEXT NOT NULL DEFAULT 'PENDING',
    "paymentMethod" TEXT,
    "subtotalCents" INTEGER NOT NULL,
    "serviceFeeCents" INTEGER NOT NULL DEFAULT 0,
    "totalCents" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "diningTableId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CustomerOrder_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "CustomerOrder_mode_check" CHECK ("mode" = 'DINE_IN'),
    CONSTRAINT "CustomerOrder_status_check" CHECK ("status" IN ('RECEIVED', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED')),
    CONSTRAINT "CustomerOrder_paymentStatus_check" CHECK ("paymentStatus" IN ('PENDING', 'PAID')),
    CONSTRAINT "CustomerOrder_subtotalCents_check" CHECK ("subtotalCents" >= 0),
    CONSTRAINT "CustomerOrder_serviceFeeCents_check" CHECK ("serviceFeeCents" >= 0),
    CONSTRAINT "CustomerOrder_totalCents_check" CHECK ("totalCents" >= 0),
    CONSTRAINT "CustomerOrder_diningTableId_fkey" FOREIGN KEY ("diningTableId") REFERENCES "DiningTable" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "OrderItem" (
    "id" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "productId" TEXT,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "basePriceCents" INTEGER NOT NULL,
    "extraPriceCents" INTEGER NOT NULL DEFAULT 0,
    "unitPriceCents" INTEGER NOT NULL,
    "lineTotalCents" INTEGER NOT NULL,
    "customization" TEXT NOT NULL DEFAULT '[]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderItem_quantity_check" CHECK ("quantity" BETWEEN 1 AND 20),
    CONSTRAINT "OrderItem_basePriceCents_check" CHECK ("basePriceCents" >= 0),
    CONSTRAINT "OrderItem_extraPriceCents_check" CHECK ("extraPriceCents" >= 0),
    CONSTRAINT "OrderItem_unitPriceCents_check" CHECK ("unitPriceCents" >= 0),
    CONSTRAINT "OrderItem_lineTotalCents_check" CHECK ("lineTotalCents" >= 0),
    CONSTRAINT "OrderItem_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "CustomerOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "OrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MenuItem" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE "OrderStatusHistory" (
    "id" TEXT NOT NULL,
    "orderId" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "actor" TEXT NOT NULL DEFAULT 'SYSTEM',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OrderStatusHistory_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "OrderStatusHistory_status_check" CHECK ("status" IN ('RECEIVED', 'PREPARING', 'READY', 'SERVED', 'PAID', 'CANCELLED')),
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
