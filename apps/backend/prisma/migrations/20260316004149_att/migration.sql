-- CreateEnum
CREATE TYPE "PurchaseStep" AS ENUM ('RESERVA_CRIADA', 'PAGAMENTO_RESERVA_CONFIRMADO', 'CADASTRO_CLIENTE', 'CADASTRO_CONJUGE', 'UPLOAD_DOCUMENTOS', 'SIMULACAO_PAGAMENTO', 'CONFIRMACAO_CONDICOES', 'GERAR_CONTRATO', 'ASSINAR_CONTRATO', 'VENDA_CONFIRMADA');

-- CreateEnum
CREATE TYPE "PurchasePartyRole" AS ENUM ('PRIMARY', 'SPOUSE');

-- CreateEnum
CREATE TYPE "PurchaseDocumentType" AS ENUM ('RG', 'CPF', 'COMPROVANTE_RESIDENCIA', 'CERTIDAO_CASAMENTO');

-- CreateEnum
CREATE TYPE "PurchaseFunnelEventType" AS ENUM ('RESERVA_CRIADA', 'PAGAMENTO_RESERVA', 'CADASTRO_INICIADO', 'CADASTRO_CONCLUIDO', 'DOCUMENTOS_ENVIADOS', 'SIMULACAO_APROVADA', 'CONTRATO_GERADO', 'CONTRATO_ASSINADO', 'VENDA_CONFIRMADA');

-- CreateEnum
CREATE TYPE "DigitalSignatureProvider" AS ENUM ('MANUAL', 'CLICKSIGN', 'DOCUSIGN', 'ZAPSIGN');

-- CreateEnum
CREATE TYPE "ContractEnvelopeStatus" AS ENUM ('DRAFT', 'GENERATED', 'SENT_FOR_SIGNATURE', 'SIGNED', 'CANCELLED');

-- CreateTable
CREATE TABLE "PurchaseFlowConfig" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "requireSpouseWhenMaritalStatus" TEXT[] DEFAULT ARRAY['CASADO', 'UNIAO_ESTAVEL']::TEXT[],
    "signatureProvider" "DigitalSignatureProvider" NOT NULL DEFAULT 'MANUAL',
    "signatureProviderConfig" JSONB,
    "autoGenerateContract" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseFlowConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseFieldRequirement" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "field" TEXT NOT NULL,
    "label" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseFieldRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDocumentRequirement" (
    "id" TEXT NOT NULL,
    "configId" TEXT NOT NULL,
    "documentType" "PurchaseDocumentType" NOT NULL,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PurchaseDocumentRequirement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePaymentTable" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "entryMinPercent" DECIMAL(5,2) NOT NULL DEFAULT 10,
    "maxInstallments" INTEGER NOT NULL,
    "correctionIndex" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchasePaymentTable_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchasePaymentCondition" (
    "id" TEXT NOT NULL,
    "tableId" TEXT NOT NULL,
    "numberInstallments" INTEGER NOT NULL,
    "entryAmount" DECIMAL(12,2) NOT NULL,
    "installmentAmount" DECIMAL(12,2) NOT NULL,
    "totalAmount" DECIMAL(12,2),

    CONSTRAINT "PurchasePaymentCondition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ContractTemplate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "contentTemplate" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ContractTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseProcess" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "currentStep" "PurchaseStep" NOT NULL DEFAULT 'RESERVA_CRIADA',
    "cadastroClienteCompleto" BOOLEAN NOT NULL DEFAULT false,
    "cadastroConjugeCompleto" BOOLEAN NOT NULL DEFAULT false,
    "documentosEnviados" BOOLEAN NOT NULL DEFAULT false,
    "simulacaoAprovada" BOOLEAN NOT NULL DEFAULT false,
    "condicoesConfirmadas" BOOLEAN NOT NULL DEFAULT false,
    "contratoGerado" BOOLEAN NOT NULL DEFAULT false,
    "contratoAssinado" BOOLEAN NOT NULL DEFAULT false,
    "vendaConfirmada" BOOLEAN NOT NULL DEFAULT false,
    "requiresSpouse" BOOLEAN NOT NULL DEFAULT false,
    "selectedPaymentTableId" TEXT,
    "selectedPaymentConditionId" TEXT,
    "selectedContractTemplateId" TEXT,
    "simulationSnapshot" JSONB,
    "reservationExpiresAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseProcess_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseClientProfile" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "role" "PurchasePartyRole" NOT NULL,
    "name" TEXT,
    "cpf" TEXT,
    "rg" TEXT,
    "maritalStatus" TEXT,
    "occupation" TEXT,
    "monthlyIncome" DECIMAL(12,2),
    "address" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZip" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseClientProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseDocument" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "role" "PurchasePartyRole" NOT NULL DEFAULT 'PRIMARY',
    "documentType" "PurchaseDocumentType" NOT NULL,
    "fileName" TEXT,
    "fileUrl" TEXT NOT NULL,
    "mimeType" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseGeneratedContract" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "templateId" TEXT,
    "status" "ContractEnvelopeStatus" NOT NULL DEFAULT 'DRAFT',
    "signatureProvider" "DigitalSignatureProvider" NOT NULL DEFAULT 'MANUAL',
    "signatureRequestId" TEXT,
    "renderedText" TEXT,
    "renderedHtml" TEXT,
    "pdfUrl" TEXT,
    "signedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseGeneratedContract_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseStepSla" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "step" "PurchaseStep" NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "durationSeconds" INTEGER,

    CONSTRAINT "PurchaseStepSla_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseFunnelEvent" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "processId" TEXT,
    "eventType" "PurchaseFunnelEventType" NOT NULL,
    "step" "PurchaseStep",
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseFunnelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseAccessCode" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseAccessCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PurchaseAccessSession" (
    "id" TEXT NOT NULL,
    "processId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "lastAccessAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PurchaseAccessSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseFlowConfig_projectId_key" ON "PurchaseFlowConfig"("projectId");

-- CreateIndex
CREATE INDEX "PurchaseFlowConfig_tenantId_projectId_idx" ON "PurchaseFlowConfig"("tenantId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseFieldRequirement_configId_field_key" ON "PurchaseFieldRequirement"("configId", "field");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseDocumentRequirement_configId_documentType_key" ON "PurchaseDocumentRequirement"("configId", "documentType");

-- CreateIndex
CREATE INDEX "PurchasePaymentTable_tenantId_projectId_idx" ON "PurchasePaymentTable"("tenantId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchasePaymentCondition_tableId_numberInstallments_key" ON "PurchasePaymentCondition"("tableId", "numberInstallments");

-- CreateIndex
CREATE INDEX "ContractTemplate_tenantId_projectId_idx" ON "ContractTemplate"("tenantId", "projectId");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseProcess_leadId_key" ON "PurchaseProcess"("leadId");

-- CreateIndex
CREATE INDEX "PurchaseProcess_tenantId_projectId_idx" ON "PurchaseProcess"("tenantId", "projectId");

-- CreateIndex
CREATE INDEX "PurchaseProcess_currentStep_idx" ON "PurchaseProcess"("currentStep");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseClientProfile_processId_role_key" ON "PurchaseClientProfile"("processId", "role");

-- CreateIndex
CREATE INDEX "PurchaseDocument_processId_role_idx" ON "PurchaseDocument"("processId", "role");

-- CreateIndex
CREATE INDEX "PurchaseDocument_documentType_idx" ON "PurchaseDocument"("documentType");

-- CreateIndex
CREATE INDEX "PurchaseGeneratedContract_processId_status_idx" ON "PurchaseGeneratedContract"("processId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "PurchaseStepSla_processId_step_key" ON "PurchaseStepSla"("processId", "step");

-- CreateIndex
CREATE INDEX "PurchaseFunnelEvent_tenantId_projectId_eventType_idx" ON "PurchaseFunnelEvent"("tenantId", "projectId", "eventType");

-- CreateIndex
CREATE INDEX "PurchaseFunnelEvent_processId_createdAt_idx" ON "PurchaseFunnelEvent"("processId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PurchaseAccessCode_processId_createdAt_idx" ON "PurchaseAccessCode"("processId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "PurchaseAccessCode_email_phone_idx" ON "PurchaseAccessCode"("email", "phone");

-- CreateIndex
CREATE INDEX "PurchaseAccessSession_processId_idx" ON "PurchaseAccessSession"("processId");

-- CreateIndex
CREATE INDEX "PurchaseAccessSession_email_phone_idx" ON "PurchaseAccessSession"("email", "phone");

-- AddForeignKey
ALTER TABLE "PurchaseFlowConfig" ADD CONSTRAINT "PurchaseFlowConfig_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseFieldRequirement" ADD CONSTRAINT "PurchaseFieldRequirement_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PurchaseFlowConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDocumentRequirement" ADD CONSTRAINT "PurchaseDocumentRequirement_configId_fkey" FOREIGN KEY ("configId") REFERENCES "PurchaseFlowConfig"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePaymentTable" ADD CONSTRAINT "PurchasePaymentTable_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchasePaymentCondition" ADD CONSTRAINT "PurchasePaymentCondition_tableId_fkey" FOREIGN KEY ("tableId") REFERENCES "PurchasePaymentTable"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ContractTemplate" ADD CONSTRAINT "ContractTemplate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_selectedPaymentTableId_fkey" FOREIGN KEY ("selectedPaymentTableId") REFERENCES "PurchasePaymentTable"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_selectedPaymentConditionId_fkey" FOREIGN KEY ("selectedPaymentConditionId") REFERENCES "PurchasePaymentCondition"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseProcess" ADD CONSTRAINT "PurchaseProcess_selectedContractTemplateId_fkey" FOREIGN KEY ("selectedContractTemplateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseClientProfile" ADD CONSTRAINT "PurchaseClientProfile_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseDocument" ADD CONSTRAINT "PurchaseDocument_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseGeneratedContract" ADD CONSTRAINT "PurchaseGeneratedContract_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseGeneratedContract" ADD CONSTRAINT "PurchaseGeneratedContract_templateId_fkey" FOREIGN KEY ("templateId") REFERENCES "ContractTemplate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseStepSla" ADD CONSTRAINT "PurchaseStepSla_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseFunnelEvent" ADD CONSTRAINT "PurchaseFunnelEvent_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseFunnelEvent" ADD CONSTRAINT "PurchaseFunnelEvent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseFunnelEvent" ADD CONSTRAINT "PurchaseFunnelEvent_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseAccessCode" ADD CONSTRAINT "PurchaseAccessCode_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PurchaseAccessSession" ADD CONSTRAINT "PurchaseAccessSession_processId_fkey" FOREIGN KEY ("processId") REFERENCES "PurchaseProcess"("id") ON DELETE CASCADE ON UPDATE CASCADE;
