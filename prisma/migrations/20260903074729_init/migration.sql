-- CreateTable
CREATE TABLE "products" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'Smartphones',
    "tagline" TEXT,
    "description" TEXT,
    "isNew" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_highlights" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variants" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "colorName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL,
    "storage" TEXT NOT NULL,
    "mrpPaise" INTEGER NOT NULL,
    "pricePaise" INTEGER NOT NULL,
    "inStock" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variant_images" (
    "id" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "alt" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "variant_images_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mutual_funds" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "amc" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "expectedReturnBps" INTEGER NOT NULL,
    "riskLevel" TEXT NOT NULL DEFAULT 'Low',

    CONSTRAINT "mutual_funds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emi_plans" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "fundId" TEXT NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "interestRateBps" INTEGER NOT NULL DEFAULT 0,
    "cashbackPaise" INTEGER NOT NULL DEFAULT 0,
    "processingFeePaise" INTEGER NOT NULL DEFAULT 0,
    "isRecommended" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "position" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emi_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emi_applications" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "variantId" TEXT NOT NULL,
    "emiPlanId" TEXT NOT NULL,
    "principalPaise" INTEGER NOT NULL,
    "monthlyAmountPaise" INTEGER NOT NULL,
    "totalPayablePaise" INTEGER NOT NULL,
    "cashbackPaise" INTEGER NOT NULL,
    "tenureMonths" INTEGER NOT NULL,
    "interestRateBps" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emi_applications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE INDEX "products_isActive_position_idx" ON "products"("isActive", "position");

-- CreateIndex
CREATE INDEX "product_highlights_productId_position_idx" ON "product_highlights"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "variants_sku_key" ON "variants"("sku");

-- CreateIndex
CREATE INDEX "variants_productId_position_idx" ON "variants"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "variants_productId_slug_key" ON "variants"("productId", "slug");

-- CreateIndex
CREATE INDEX "variant_images_variantId_position_idx" ON "variant_images"("variantId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "mutual_funds_code_key" ON "mutual_funds"("code");

-- CreateIndex
CREATE INDEX "emi_plans_productId_position_idx" ON "emi_plans"("productId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "emi_plans_productId_tenureMonths_key" ON "emi_plans"("productId", "tenureMonths");

-- CreateIndex
CREATE UNIQUE INDEX "emi_applications_reference_key" ON "emi_applications"("reference");

-- CreateIndex
CREATE INDEX "emi_applications_createdAt_idx" ON "emi_applications"("createdAt");

-- AddForeignKey
ALTER TABLE "product_highlights" ADD CONSTRAINT "product_highlights_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variants" ADD CONSTRAINT "variants_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variant_images" ADD CONSTRAINT "variant_images_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_plans" ADD CONSTRAINT "emi_plans_fundId_fkey" FOREIGN KEY ("fundId") REFERENCES "mutual_funds"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_plans" ADD CONSTRAINT "emi_plans_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_applications" ADD CONSTRAINT "emi_applications_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "variants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emi_applications" ADD CONSTRAINT "emi_applications_emiPlanId_fkey" FOREIGN KEY ("emiPlanId") REFERENCES "emi_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
