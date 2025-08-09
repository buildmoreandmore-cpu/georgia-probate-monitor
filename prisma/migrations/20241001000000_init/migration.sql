-- CreateTable
CREATE TABLE "cases" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "filingDate" TIMESTAMP(3) NOT NULL,
    "decedentName" TEXT NOT NULL,
    "decedentAddress" TEXT,
    "estateValue" DOUBLE PRECISION,
    "caseNumber" TEXT,
    "attorney" TEXT,
    "attorneyPhone" TEXT,
    "courtUrl" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contacts" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "originalAddress" TEXT,
    "standardizedAddress" TEXT,
    "upsDeliverable" BOOLEAN NOT NULL DEFAULT false,
    "phone" TEXT,
    "phoneSource" TEXT,
    "phoneConfidence" DOUBLE PRECISION DEFAULT 0,
    "email" TEXT,
    "relationship" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "parcels" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "parcelId" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "situsAddress" TEXT,
    "taxMailingAddress" TEXT,
    "currentOwner" TEXT,
    "lastSaleDate" TIMESTAMP(3),
    "assessedValue" DOUBLE PRECISION,
    "legalDescription" TEXT,
    "qpublicUrl" TEXT,
    "matchConfidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "parcels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scraping_jobs" (
    "id" TEXT NOT NULL,
    "county" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "recordsFound" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "scraping_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PhoneUpload" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "records" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PhoneUpload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE UNIQUE INDEX "cases_caseId_key" ON "cases"("caseId");

-- CreateIndex
CREATE UNIQUE INDEX "cases_caseNumber_key" ON "cases"("caseNumber");

-- CreateIndex
CREATE INDEX "cases_county_idx" ON "cases"("county");

-- CreateIndex
CREATE INDEX "cases_filingDate_idx" ON "cases"("filingDate");

-- CreateIndex
CREATE INDEX "contacts_caseId_idx" ON "contacts"("caseId");

-- CreateIndex
CREATE INDEX "contacts_type_idx" ON "contacts"("type");

-- CreateIndex
CREATE UNIQUE INDEX "parcels_parcelId_key" ON "parcels"("parcelId");

-- CreateIndex
CREATE INDEX "parcels_caseId_idx" ON "parcels"("caseId");

-- CreateIndex
CREATE INDEX "parcels_county_idx" ON "parcels"("county");

-- CreateIndex
CREATE INDEX "parcels_parcelId_idx" ON "parcels"("parcelId");

-- CreateIndex
CREATE INDEX "scraping_jobs_county_idx" ON "scraping_jobs"("county");

-- CreateIndex
CREATE INDEX "scraping_jobs_status_idx" ON "scraping_jobs"("status");

-- AddForeignKey
ALTER TABLE "contacts" ADD CONSTRAINT "contacts_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "parcels" ADD CONSTRAINT "parcels_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;