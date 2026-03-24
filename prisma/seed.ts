import {
  AccountingAccountCategory,
  AccountingAccountNature,
  AccountingModule,
  BankMovementType,
  CashMovementType,
  ClientType,
  CommercialDocumentStatus,
  CommercialDocumentType,
  CommercialItemType,
  CommercialLedgerEntryType,
  CommercialReceiptStatus,
  CurrencyCode,
  FiscalOperationType,
  FiscalPointOfSaleUse,
  FiscalProcessingStatus,
  FiscalDocumentStatus,
  FiscalDocumentType,
  FiscalEnvironment,
  FiscalIvaCondition,
  GrossIncomeCondition,
  ItemType,
  MembershipRole,
  PaymentMethod,
  PrismaClient,
  ProductionOrderStatus,
  StockMovementType,
  SupplierDocumentStatus,
  SupplierLedgerEntryType,
  TreasuryMovementDirection,
} from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.commercialLedgerEntry.deleteMany();
  await prisma.commercialReceiptApplication.deleteMany();
  await prisma.commercialReceipt.deleteMany();
  await prisma.commercialDocumentLine.deleteMany();
  await prisma.commercialDocument.deleteMany();
  await prisma.client.deleteMany();
  await prisma.fiscalProcessingLog.deleteMany();
  await prisma.fiscalDocument.deleteMany();
  await prisma.fiscalPointOfSale.deleteMany();
  await prisma.fiscalConfig.deleteMany();
  await prisma.fileAttachment.deleteMany();
  await prisma.supplierLedgerEntry.deleteMany();
  await prisma.supplierPaymentItem.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.bankMovement.deleteMany();
  await prisma.supplierPayment.deleteMany();
  await prisma.supplierInvoice.deleteMany();
  await prisma.accountingEntryLine.deleteMany();
  await prisma.accountingEntry.deleteMany();
  await prisma.accountingPostingRule.deleteMany();
  await prisma.accountingPostingType.deleteMany();
  await prisma.cashBox.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.productionConsumption.deleteMany();
  await prisma.productionRequirement.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.productionOrder.deleteMany();
  await prisma.bomLine.deleteMany();
  await prisma.bom.deleteMany();
  await prisma.item.deleteMany();
  await prisma.accountingAccount.deleteMany();
  await prisma.companyAccountingPlan.deleteMany();
  await prisma.accountingPlan.deleteMany();
  await prisma.warehouse.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.user.deleteMany();
  await prisma.company.deleteMany();

  const company = await prisma.company.create({
    data: {
      name: "Quercus Foods",
      slug: "quercus-foods",
    },
  });

  const secondaryCompany = await prisma.company.create({
    data: {
      name: "Quercus Contract Manufacturing",
      slug: "quercus-contract",
    },
  });

  const owner = await prisma.user.create({
    data: {
      name: "Paula Planner",
      email: "paula@quercus.local",
    },
  });

  const operator = await prisma.user.create({
    data: {
      name: "Oscar Operaciones",
      email: "oscar@quercus.local",
    },
  });

  const viewer = await prisma.user.create({
    data: {
      name: "Violeta Viewer",
      email: "violeta@quercus.local",
    },
  });

  await prisma.membership.createMany({
    data: [
      { companyId: company.id, userId: owner.id, role: MembershipRole.OWNER },
      { companyId: company.id, userId: operator.id, role: MembershipRole.OPERATOR },
      { companyId: company.id, userId: viewer.id, role: MembershipRole.VIEWER },
      { companyId: secondaryCompany.id, userId: owner.id, role: MembershipRole.PLANNER },
    ],
  });

  const fiscalConfig = await prisma.fiscalConfig.create({
    data: {
      companyId: company.id,
      cuit: "20123456786",
      legalName: "Quercus Foods S.A.",
      ivaCondition: FiscalIvaCondition.RESPONSABLE_INSCRIPTO,
      grossIncomeCondition: GrossIncomeCondition.MULTILATERAL,
      taxAddress: "Av. Siempre Viva 742, CABA",
      fiscalEnvironment: FiscalEnvironment.TESTING,
      integrationEnabled: false,
      isActive: true,
      technicalReference: "afip/wsfev1/demo",
      certificateReference: "vault://quercus/demo-cert",
      privateKeyReference: "vault://quercus/demo-key",
      integrationParameters: {
        wsaaProfile: "homologacion",
        notes: "Base fiscal demo; sin credenciales reales.",
      },
    },
  });

  const fiscalPointOfSale = await prisma.fiscalPointOfSale.create({
    data: {
      companyId: company.id,
      fiscalConfigId: fiscalConfig.id,
      pointOfSaleNumber: 1,
      description: "Punto de venta homologación principal",
      use: FiscalPointOfSaleUse.SALES,
      active: true,
      metadata: {
        channel: "erp",
      },
    },
  });

  await prisma.fiscalProcessingLog.create({
    data: {
      companyId: company.id,
      fiscalConfigId: fiscalConfig.id,
      fiscalPointOfSaleId: fiscalPointOfSale.id,
      userId: owner.id,
      sourceEntityType: "SYSTEM_BOOTSTRAP",
      sourceEntityId: company.id,
      operationType: FiscalOperationType.VALIDATE_CONFIGURATION,
      status: FiscalProcessingStatus.SUCCESS,
      responsePayload: {
        message: "Configuración fiscal base inicializada para demo.",
      },
      processedAt: new Date(),
    },
  });

  const warehouse = await prisma.warehouse.create({
    data: {
      companyId: company.id,
      code: "PLANTA",
      name: "Planta Principal",
    },
  });

  await prisma.warehouse.create({
    data: {
      companyId: secondaryCompany.id,
      code: "CM01",
      name: "Tercero Córdoba",
    },
  });

  const basePlan = await prisma.accountingPlan.create({
    data: {
      code: "PLAN-BASE-AR",
      name: "Plan base Argentina",
      description: "Plan contable base reutilizable para múltiples empresas.",
      isBase: true,
      versionLabel: "2026.1",
    },
  });

  const customPlan = await prisma.accountingPlan.create({
    data: {
      companyId: company.id,
      sourcePlanId: basePlan.id,
      code: "QF-OPERATIVO-2026",
      name: "Plan operativo Quercus Foods",
      description: "Plan derivado para parametrización operativa y contable del tenant principal.",
      versionLabel: "QF-2026.1",
    },
  });

  await prisma.companyAccountingPlan.createMany({
    data: [
      { companyId: company.id, planId: basePlan.id, isDefault: false, isActive: true },
      { companyId: company.id, planId: customPlan.id, isDefault: true, isActive: true },
      { companyId: secondaryCompany.id, planId: basePlan.id, isDefault: true, isActive: true },
    ],
  });

  const currentAssets = await prisma.accountingAccount.create({
    data: {
      companyId: company.id,
      planId: customPlan.id,
      code: "1.1",
      name: "Activo corriente",
      category: AccountingAccountCategory.CURRENT_ASSET,
      nature: AccountingAccountNature.ASSET,
      allowsDirectPosting: false,
      level: 1,
    },
  });

  const currentLiabilities = await prisma.accountingAccount.create({
    data: {
      companyId: company.id,
      planId: customPlan.id,
      code: "2.1",
      name: "Pasivo corriente",
      category: AccountingAccountCategory.CURRENT_LIABILITY,
      nature: AccountingAccountNature.LIABILITY,
      allowsDirectPosting: false,
      level: 1,
    },
  });

  const operatingExpenses = await prisma.accountingAccount.create({
    data: {
      companyId: company.id,
      planId: customPlan.id,
      code: "5.1",
      name: "Gastos operativos",
      category: AccountingAccountCategory.OPERATING_EXPENSE,
      nature: AccountingAccountNature.EXPENSE,
      allowsDirectPosting: false,
      level: 1,
    },
  });

  const productionResults = await prisma.accountingAccount.create({
    data: {
      companyId: company.id,
      planId: customPlan.id,
      code: "5.2",
      name: "Resultados de producción",
      category: AccountingAccountCategory.PRODUCTION_VARIANCE,
      nature: AccountingAccountNature.RESULT,
      allowsDirectPosting: false,
      level: 1,
    },
  });

  const operatingRevenue = await prisma.accountingAccount.create({
    data: {
      companyId: company.id,
      planId: customPlan.id,
      code: "4.1",
      name: "Ingresos operativos",
      category: AccountingAccountCategory.OPERATING_REVENUE,
      nature: AccountingAccountNature.REVENUE,
      allowsDirectPosting: false,
      level: 1,
    },
  });

  const [cashAccount, bankAccountLedger, supplierPayables, customerReceivables, salesRevenue, rawMaterialInventory, finishedGoodsInventory, purchaseExpense, workInProgress] =
    await Promise.all([
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: currentAssets.id,
          code: "1.1.5",
          name: "Clientes cuenta corriente",
          category: AccountingAccountCategory.CURRENT_ASSET,
          nature: AccountingAccountNature.ASSET,
          level: 2,
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: operatingRevenue.id,
          code: "4.1.1",
          name: "Ventas mercado interno",
          category: AccountingAccountCategory.OPERATING_REVENUE,
          nature: AccountingAccountNature.REVENUE,
          level: 2,
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: currentAssets.id,
          code: "1.1.1",
          name: "Caja general",
          category: AccountingAccountCategory.CURRENT_ASSET,
          nature: AccountingAccountNature.ASSET,
          level: 2,
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: currentAssets.id,
          code: "1.1.2",
          name: "Banco Galicia cuenta corriente",
          category: AccountingAccountCategory.CURRENT_ASSET,
          nature: AccountingAccountNature.ASSET,
          level: 2,
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: currentLiabilities.id,
          code: "2.1.1",
          name: "Proveedores nacionales",
          category: AccountingAccountCategory.CURRENT_LIABILITY,
          nature: AccountingAccountNature.LIABILITY,
          level: 2,
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: currentAssets.id,
          code: "1.1.3",
          name: "Inventario materias primas",
          category: AccountingAccountCategory.CURRENT_ASSET,
          nature: AccountingAccountNature.ASSET,
          level: 2,
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: currentAssets.id,
          code: "1.1.4",
          name: "Inventario productos terminados",
          category: AccountingAccountCategory.CURRENT_ASSET,
          nature: AccountingAccountNature.ASSET,
          level: 2,
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: operatingExpenses.id,
          code: "5.1.1",
          name: "Compras y servicios de proveedores",
          category: AccountingAccountCategory.OPERATING_EXPENSE,
          nature: AccountingAccountNature.EXPENSE,
          level: 2,
        },
      }),
      prisma.accountingAccount.create({
        data: {
          companyId: company.id,
          planId: customPlan.id,
          parentAccountId: productionResults.id,
          code: "5.2.1",
          name: "Producción en proceso",
          category: AccountingAccountCategory.PRODUCTION_VARIANCE,
          nature: AccountingAccountNature.RESULT,
          level: 2,
        },
      }),
    ]);

  const [supplierInvoicePostingType, supplierPaymentPostingType, stockPostingType, productionPostingType, cashPostingType, salesDocumentPostingType, salesReceiptPostingType] =
    await Promise.all([
      prisma.accountingPostingType.create({
        data: {
          companyId: company.id,
          module: AccountingModule.SUPPLIERS,
          code: "SUPPLIER_INVOICE",
          name: "Factura de proveedor",
          description: "Imputación base de compra a proveedor.",
          isSystem: true,
        },
      }),
      prisma.accountingPostingType.create({
        data: {
          companyId: company.id,
          module: AccountingModule.TREASURY,
          code: "SUPPLIER_PAYMENT",
          name: "Pago a proveedor",
          description: "Imputación base de cancelación de deuda a proveedor.",
          isSystem: true,
        },
      }),
      prisma.accountingPostingType.create({
        data: {
          companyId: company.id,
          module: AccountingModule.STOCK,
          code: "STOCK_MOVEMENT",
          name: "Movimiento de stock",
          description: "Preparación para imputaciones futuras del ledger de inventario.",
          isSystem: true,
        },
      }),
      prisma.accountingPostingType.create({
        data: {
          companyId: company.id,
          module: AccountingModule.PRODUCTION,
          code: "PRODUCTION_CLOSE",
          name: "Cierre de orden de producción",
          description: "Preparación para imputación de consumos y producción terminada.",
          isSystem: true,
        },
      }),
      prisma.accountingPostingType.create({
        data: {
          companyId: company.id,
          module: AccountingModule.TREASURY,
          code: "CASH_MOVEMENT",
          name: "Movimiento de caja",
          description: "Regla mínima para movimientos manuales de caja.",
          isSystem: true,
        },
      }),
      prisma.accountingPostingType.create({
        data: {
          companyId: company.id,
          module: AccountingModule.SALES,
          code: "COMMERCIAL_DOCUMENT",
          name: "Comprobante comercial",
          description: "Base de imputación para ventas comerciales internas.",
          isSystem: true,
        },
      }),
      prisma.accountingPostingType.create({
        data: {
          companyId: company.id,
          module: AccountingModule.SALES,
          code: "COMMERCIAL_RECEIPT",
          name: "Cobranza comercial",
          description: "Base de imputación para cobranzas de clientes.",
          isSystem: true,
        },
      }),
    ]);

  const supplierInvoiceRule = await prisma.accountingPostingRule.create({
    data: {
      companyId: company.id,
      postingTypeId: supplierInvoicePostingType.id,
      module: AccountingModule.SUPPLIERS,
      sourceEntityType: "SUPPLIER_INVOICE",
      operationType: "PURCHASE_INVOICE",
      description: "Regla base para registrar factura de proveedor.",
      defaultDebitAccountId: purchaseExpense.id,
      defaultCreditAccountId: supplierPayables.id,
      priority: 10,
    },
  });

  const supplierPaymentRule = await prisma.accountingPostingRule.create({
    data: {
      companyId: company.id,
      postingTypeId: supplierPaymentPostingType.id,
      module: AccountingModule.TREASURY,
      sourceEntityType: "SUPPLIER_PAYMENT",
      operationType: "SUPPLIER_PAYMENT",
      description: "Regla base para pagos bancarios a proveedores.",
      defaultDebitAccountId: supplierPayables.id,
      defaultCreditAccountId: bankAccountLedger.id,
      priority: 10,
    },
  });

  const cashMovementRule = await prisma.accountingPostingRule.create({
    data: {
      companyId: company.id,
      postingTypeId: cashPostingType.id,
      module: AccountingModule.TREASURY,
      sourceEntityType: "CASH_MOVEMENT",
      operationType: "CASH_ADJUSTMENT",
      description: "Regla mínima para egresos manuales de caja.",
      defaultDebitAccountId: purchaseExpense.id,
      defaultCreditAccountId: cashAccount.id,
      priority: 10,
    },
  });

  const stockConsumptionRule = await prisma.accountingPostingRule.create({
    data: {
      companyId: company.id,
      postingTypeId: stockPostingType.id,
      module: AccountingModule.STOCK,
      sourceEntityType: "STOCK_MOVEMENT",
      operationType: "PRODUCTION_CONSUMPTION",
      movementType: "PRODUCTION_CONSUMPTION",
      description: "Consumo de materias primas hacia producción en proceso.",
      defaultDebitAccountId: workInProgress.id,
      defaultCreditAccountId: rawMaterialInventory.id,
      priority: 10,
    },
  });

  const stockOutputRule = await prisma.accountingPostingRule.create({
    data: {
      companyId: company.id,
      postingTypeId: stockPostingType.id,
      module: AccountingModule.STOCK,
      sourceEntityType: "STOCK_MOVEMENT",
      operationType: "PRODUCTION_OUTPUT",
      movementType: "PRODUCTION_OUTPUT",
      description: "Ingreso de producto terminado desde producción en proceso.",
      defaultDebitAccountId: finishedGoodsInventory.id,
      defaultCreditAccountId: workInProgress.id,
      priority: 10,
    },
  });

  const productionCloseRule = await prisma.accountingPostingRule.create({
    data: {
      companyId: company.id,
      postingTypeId: productionPostingType.id,
      module: AccountingModule.PRODUCTION,
      sourceEntityType: "PRODUCTION_ORDER",
      operationType: "PRODUCTION_CLOSE",
      description: "Regla de referencia para cierre de orden y futura generación de asiento.",
      defaultDebitAccountId: finishedGoodsInventory.id,
      defaultCreditAccountId: workInProgress.id,
      priority: 20,
    },
  });

  const salesDocumentRule = await prisma.accountingPostingRule.create({
    data: {
      companyId: company.id,
      postingTypeId: salesDocumentPostingType.id,
      module: AccountingModule.SALES,
      sourceEntityType: "COMMERCIAL_DOCUMENT",
      operationType: "SALES_DOCUMENT",
      description: "Regla base para devengamiento de venta comercial.",
      defaultDebitAccountId: customerReceivables.id,
      defaultCreditAccountId: salesRevenue.id,
      priority: 10,
    },
  });

  const salesReceiptRule = await prisma.accountingPostingRule.create({
    data: {
      companyId: company.id,
      postingTypeId: salesReceiptPostingType.id,
      module: AccountingModule.SALES,
      sourceEntityType: "COMMERCIAL_RECEIPT",
      operationType: "CUSTOMER_RECEIPT",
      description: "Regla base para cobranza comercial.",
      defaultDebitAccountId: bankAccountLedger.id,
      defaultCreditAccountId: customerReceivables.id,
      priority: 10,
    },
  });

  const [harina, azucar, cacao, empaque, alfajor] = await Promise.all([
    prisma.item.create({
      data: {
        companyId: company.id,
        sku: "MP-HAR-0001",
        name: "Harina 000",
        uom: "kg",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 1.45,
        inventoryAccountId: rawMaterialInventory.id,
        expenseAccountId: purchaseExpense.id,
      },
    }),
    prisma.item.create({
      data: {
        companyId: company.id,
        sku: "MP-AZU-0001",
        name: "Azúcar refinada",
        uom: "kg",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 1.9,
        inventoryAccountId: rawMaterialInventory.id,
        expenseAccountId: purchaseExpense.id,
      },
    }),
    prisma.item.create({
      data: {
        companyId: company.id,
        sku: "MP-CAC-0001",
        name: "Cacao en polvo",
        uom: "kg",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 6.3,
        inventoryAccountId: rawMaterialInventory.id,
        expenseAccountId: purchaseExpense.id,
      },
    }),
    prisma.item.create({
      data: {
        companyId: company.id,
        sku: "MP-EMP-0001",
        name: "Flow pack individual",
        uom: "un",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 0.11,
        inventoryAccountId: rawMaterialInventory.id,
        expenseAccountId: purchaseExpense.id,
      },
    }),
    prisma.item.create({
      data: {
        companyId: company.id,
        sku: "PT-ALF-0012",
        name: "Alfajor cacao 55g",
        uom: "un",
        itemType: ItemType.FINISHED_GOOD,
        isManufacturable: true,
        standardCost: 1.35,
        inventoryAccountId: finishedGoodsInventory.id,
        salesAccountId: salesRevenue.id,
        commercialItemType: CommercialItemType.PRODUCT,
        isCommercialSellable: true,
        defaultSalePrice: 2.95,
      },
    }),
  ]);

  const servicioLogistico = await prisma.item.create({
    data: {
      companyId: company.id,
      sku: "SRV-LOG-0001",
      name: "Servicio logístico local",
      uom: "servicio",
      itemType: ItemType.SERVICE,
      standardCost: 0,
      salesAccountId: salesRevenue.id,
      commercialItemType: CommercialItemType.SERVICE,
      isCommercialSellable: true,
      defaultSalePrice: 25000,
    },
  });

  const bom = await prisma.bom.create({
    data: {
      companyId: company.id,
      finishedItemId: alfajor.id,
      code: "BOM-ALFAJOR-55G-V1",
      version: 1,
      baseQuantity: 100,
      notes: "Receta estándar de lote de 100 unidades.",
      lines: {
        create: [
          { componentItemId: harina.id, quantity: 8.4, scrapRate: 0.015 },
          { componentItemId: azucar.id, quantity: 3.2, scrapRate: 0.01 },
          { componentItemId: cacao.id, quantity: 1.1, scrapRate: 0.03 },
          { componentItemId: empaque.id, quantity: 100, scrapRate: 0.02 },
        ],
      },
    },
    include: { lines: true },
  });

  await prisma.stockMovement.createMany({
    data: [
      {
        companyId: company.id,
        warehouseId: warehouse.id,
        itemId: harina.id,
        movementType: StockMovementType.OPENING,
        quantity: 500,
        unitCost: 1.45,
        referenceType: "OPENING_BALANCE",
        referenceId: "seed-opening",
        traceCode: "OPENING:HARINA",
      },
      {
        companyId: company.id,
        warehouseId: warehouse.id,
        itemId: azucar.id,
        movementType: StockMovementType.OPENING,
        quantity: 180,
        unitCost: 1.9,
        referenceType: "OPENING_BALANCE",
        referenceId: "seed-opening",
        traceCode: "OPENING:AZUCAR",
      },
      {
        companyId: company.id,
        warehouseId: warehouse.id,
        itemId: cacao.id,
        movementType: StockMovementType.OPENING,
        quantity: 18,
        unitCost: 6.3,
        referenceType: "OPENING_BALANCE",
        referenceId: "seed-opening",
        traceCode: "OPENING:CACAO",
      },
      {
        companyId: company.id,
        warehouseId: warehouse.id,
        itemId: empaque.id,
        movementType: StockMovementType.OPENING,
        quantity: 150,
        unitCost: 0.11,
        referenceType: "OPENING_BALANCE",
        referenceId: "seed-opening",
        traceCode: "OPENING:EMPAQUE",
      },
      {
        companyId: company.id,
        warehouseId: warehouse.id,
        itemId: alfajor.id,
        movementType: StockMovementType.OPENING,
        quantity: 60,
        unitCost: 1.35,
        referenceType: "OPENING_BALANCE",
        referenceId: "seed-opening",
        traceCode: "OPENING:ALFAJOR",
      },
    ],
  });

  const closedOrder = await prisma.productionOrder.create({
    data: {
      companyId: company.id,
      code: "OF-0001",
      bomId: bom.id,
      finishedItemId: alfajor.id,
      warehouseId: warehouse.id,
      status: ProductionOrderStatus.CLOSED,
      plannedQuantity: 100,
      expectedOutputQty: 100,
      producedQuantity: 98,
      scrapQuantity: 2,
      notes: "OF cerrada para validar trazabilidad end-to-end.",
      accountingRuleId: productionCloseRule.id,
      createdById: owner.id,
      closedById: owner.id,
      closedAt: new Date("2026-03-15T16:00:00Z"),
      requirements: {
        create: [
          { componentItemId: harina.id, theoreticalQuantity: 8.526, availableQuantity: 500, shortageQuantity: 0 },
          { componentItemId: azucar.id, theoreticalQuantity: 3.232, availableQuantity: 180, shortageQuantity: 0 },
          { componentItemId: cacao.id, theoreticalQuantity: 1.133, availableQuantity: 18, shortageQuantity: 0 },
          { componentItemId: empaque.id, theoreticalQuantity: 102, availableQuantity: 150, shortageQuantity: 0 },
        ],
      },
      consumptions: {
        create: [
          { componentItemId: harina.id, warehouseId: warehouse.id, theoreticalQuantity: 8.526, consumedQuantity: 8.5, scrapQuantity: 0.1, lotReference: "L-HAR-0315", notes: "Pesada lote mañana.", createdById: operator.id },
          { componentItemId: azucar.id, warehouseId: warehouse.id, theoreticalQuantity: 3.232, consumedQuantity: 3.2, scrapQuantity: 0.05, lotReference: "L-AZU-0315", notes: "Consumo estándar.", createdById: operator.id },
          { componentItemId: cacao.id, warehouseId: warehouse.id, theoreticalQuantity: 1.133, consumedQuantity: 1.15, scrapQuantity: 0.02, lotReference: "L-CAC-0315", notes: "Ajuste por humedad.", createdById: operator.id },
          { componentItemId: empaque.id, warehouseId: warehouse.id, theoreticalQuantity: 102, consumedQuantity: 100, scrapQuantity: 2, lotReference: "L-EMP-0315", notes: "2 unidades dañadas.", createdById: operator.id },
        ],
      },
    },
  });

  await prisma.stockMovement.createMany({
    data: [
      { companyId: company.id, warehouseId: warehouse.id, itemId: harina.id, movementType: StockMovementType.PRODUCTION_CONSUMPTION, quantity: -8.6, unitCost: 1.45, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:MP-HAR-0001:CONSUMO", accountingRuleId: stockConsumptionRule.id },
      { companyId: company.id, warehouseId: warehouse.id, itemId: azucar.id, movementType: StockMovementType.PRODUCTION_CONSUMPTION, quantity: -3.25, unitCost: 1.9, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:MP-AZU-0001:CONSUMO", accountingRuleId: stockConsumptionRule.id },
      { companyId: company.id, warehouseId: warehouse.id, itemId: cacao.id, movementType: StockMovementType.PRODUCTION_CONSUMPTION, quantity: -1.17, unitCost: 6.3, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:MP-CAC-0001:CONSUMO", accountingRuleId: stockConsumptionRule.id },
      { companyId: company.id, warehouseId: warehouse.id, itemId: empaque.id, movementType: StockMovementType.PRODUCTION_CONSUMPTION, quantity: -102, unitCost: 0.11, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:MP-EMP-0001:CONSUMO", accountingRuleId: stockConsumptionRule.id },
      { companyId: company.id, warehouseId: warehouse.id, itemId: alfajor.id, movementType: StockMovementType.PRODUCTION_OUTPUT, quantity: 98, unitCost: 1.35, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:PT-ALF-0012:INGRESO", accountingRuleId: stockOutputRule.id },
    ],
  });

  await prisma.productionOrder.create({
    data: {
      companyId: company.id,
      code: "OF-0002",
      bomId: bom.id,
      finishedItemId: alfajor.id,
      warehouseId: warehouse.id,
      status: ProductionOrderStatus.IN_PROGRESS,
      plannedQuantity: 80,
      expectedOutputQty: 80,
      notes: "OF en curso con consumos parciales cargados.",
      createdById: owner.id,
      requirements: {
        create: [
          { componentItemId: harina.id, theoreticalQuantity: 6.821, availableQuantity: 491.4, shortageQuantity: 0 },
          { componentItemId: azucar.id, theoreticalQuantity: 2.586, availableQuantity: 176.75, shortageQuantity: 0 },
          { componentItemId: cacao.id, theoreticalQuantity: 0.906, availableQuantity: 16.83, shortageQuantity: 0 },
          { componentItemId: empaque.id, theoreticalQuantity: 81.6, availableQuantity: 48, shortageQuantity: 33.6 },
        ],
      },
      consumptions: {
        create: [
          { componentItemId: harina.id, warehouseId: warehouse.id, theoreticalQuantity: 6.821, consumedQuantity: 6.7, scrapQuantity: 0.08, lotReference: "L-HAR-0317", notes: "Primera tanda.", createdById: operator.id },
          { componentItemId: azucar.id, warehouseId: warehouse.id, theoreticalQuantity: 2.586, consumedQuantity: 2.55, scrapQuantity: 0.02, lotReference: "L-AZU-0317", notes: "Primera tanda.", createdById: operator.id },
        ],
      },
    },
  });

  await prisma.productionOrder.create({
    data: {
      companyId: company.id,
      code: "OF-0003",
      bomId: bom.id,
      finishedItemId: alfajor.id,
      warehouseId: warehouse.id,
      status: ProductionOrderStatus.DRAFT,
      plannedQuantity: 140,
      expectedOutputQty: 140,
      notes: "OF pendiente por faltante crítico de empaque.",
      createdById: owner.id,
      requirements: {
        create: [
          { componentItemId: harina.id, theoreticalQuantity: 11.937, availableQuantity: 491.4, shortageQuantity: 0 },
          { componentItemId: azucar.id, theoreticalQuantity: 4.525, availableQuantity: 176.75, shortageQuantity: 0 },
          { componentItemId: cacao.id, theoreticalQuantity: 1.586, availableQuantity: 16.83, shortageQuantity: 0 },
          { componentItemId: empaque.id, theoreticalQuantity: 142.8, availableQuantity: 48, shortageQuantity: 94.8 },
        ],
      },
    },
  });

  const [supplierHarinas, supplierServicios] = await Promise.all([
    prisma.supplier.create({
      data: {
        companyId: company.id,
        code: "PRV-0001",
        name: "Molinos del Sur",
        taxId: "30-71234567-8",
        email: "facturacion@molinosdelsur.local",
        phone: "+54 11 4000 0101",
        defaultCurrency: CurrencyCode.ARS,
        payableAccountId: supplierPayables.id,
      },
    }),
    prisma.supplier.create({
      data: {
        companyId: company.id,
        code: "PRV-0002",
        name: "Servicios Industriales Andinos",
        taxId: "30-79876543-1",
        email: "cobranzas@andinos.local",
        phone: "+54 351 500 2200",
        defaultCurrency: CurrencyCode.ARS,
        payableAccountId: supplierPayables.id,
      },
    }),
  ]);

  const [cashBox, bankAccount] = await Promise.all([
    prisma.cashBox.create({
      data: {
        companyId: company.id,
        code: "CAJA-ADM",
        name: "Caja Administración",
        currency: CurrencyCode.ARS,
        openingBalance: 250000,
        accountingAccountId: cashAccount.id,
      },
    }),
    prisma.bankAccount.create({
      data: {
        companyId: company.id,
        code: "BANCO-GALICIA-CC",
        bankName: "Banco Galicia",
        accountName: "Cuenta Corriente Operativa",
        accountNumber: "001-123456/7",
        cbuAlias: "quercus.operativa",
        currency: CurrencyCode.ARS,
        openingBalance: 1450000,
        accountingAccountId: bankAccountLedger.id,
      },
    }),
  ]);

  const invoiceHarinas = await prisma.supplierInvoice.create({
    data: {
      companyId: company.id,
      supplierId: supplierHarinas.id,
      documentNumber: "FC-A-0001-00001234",
      issueDate: new Date("2026-03-10T09:00:00Z"),
      dueDate: new Date("2026-03-20T09:00:00Z"),
      description: "Compra de harina 000 y aditivos",
      currency: CurrencyCode.ARS,
      exchangeRate: 1,
      totalAmount: 185000,
      openAmount: 35000,
      status: SupplierDocumentStatus.PARTIAL,
      accountingRuleId: supplierInvoiceRule.id,
    },
  });

  const invoiceServicios = await prisma.supplierInvoice.create({
    data: {
      companyId: company.id,
      supplierId: supplierServicios.id,
      documentNumber: "FC-B-0003-00004567",
      issueDate: new Date("2026-03-12T11:30:00Z"),
      dueDate: new Date("2026-03-27T11:30:00Z"),
      description: "Mantenimiento de línea de empaque",
      currency: CurrencyCode.ARS,
      exchangeRate: 1,
      totalAmount: 98000,
      openAmount: 98000,
      status: SupplierDocumentStatus.OPEN,
      accountingRuleId: supplierInvoiceRule.id,
    },
  });

  const payment = await prisma.supplierPayment.create({
    data: {
      companyId: company.id,
      supplierId: supplierHarinas.id,
      paymentNumber: "PAG-0001",
      paymentDate: new Date("2026-03-18T14:15:00Z"),
      currency: CurrencyCode.ARS,
      exchangeRate: 1,
      totalAmount: 150000,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      bankAccountId: bankAccount.id,
      sourceReferenceType: "BANK_ACCOUNT",
      sourceReferenceId: bankAccount.id,
      notes: "TRX 238019 - pago parcial factura harina.",
      accountingRuleId: supplierPaymentRule.id,
      items: {
        create: [
          {
            supplierInvoiceId: invoiceHarinas.id,
            amount: 150000,
            description: "Imputación FC-A-0001-00001234",
          },
        ],
      },
    },
  });

  await prisma.bankMovement.createMany({
    data: [
      {
        companyId: company.id,
        bankAccountId: bankAccount.id,
        supplierId: supplierHarinas.id,
        paymentId: payment.id,
        direction: TreasuryMovementDirection.OUT,
        movementType: BankMovementType.PAYMENT,
        amount: 150000,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        movementDate: new Date("2026-03-18T14:15:00Z"),
        description: "Pago proveedor PAG-0001",
        referenceType: "SUPPLIER_PAYMENT",
        referenceId: payment.id,
        traceCode: "PAGO-BANCO-PAG-0001",
        externalReference: "TRX 238019",
        isReconciled: false,
        accountingRuleId: supplierPaymentRule.id,
      },
      {
        companyId: company.id,
        bankAccountId: bankAccount.id,
        direction: TreasuryMovementDirection.OUT,
        movementType: BankMovementType.FEE,
        amount: 1250,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        movementDate: new Date("2026-03-18T14:16:00Z"),
        description: "Comisión por transferencia a proveedor",
        referenceType: "MANUAL_BANK",
        referenceId: "BANCO-0001",
        traceCode: "BANCO-0001",
        externalReference: "COM-238019",
        isReconciled: false,
      },
    ],
  });

  await prisma.cashMovement.createMany({
    data: [
      {
        companyId: company.id,
        cashBoxId: cashBox.id,
        direction: TreasuryMovementDirection.OUT,
        movementType: CashMovementType.ADJUSTMENT,
        amount: 8500,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        movementDate: new Date("2026-03-18T10:00:00Z"),
        description: "Pago menor de mensajería y trámites",
        referenceType: "MANUAL_CASH",
        referenceId: "CAJA-0001",
        traceCode: "CAJA-0001",
        accountingRuleId: cashMovementRule.id,
      },
      {
        companyId: company.id,
        cashBoxId: cashBox.id,
        supplierId: supplierServicios.id,
        direction: TreasuryMovementDirection.OUT,
        movementType: CashMovementType.PAYMENT,
        amount: 12000,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        movementDate: new Date("2026-03-19T08:45:00Z"),
        description: "Anticipo efectivo servicio técnico",
        referenceType: "MANUAL_CASH",
        referenceId: "CAJA-0002",
        traceCode: "CAJA-0002",
        accountingRuleId: cashMovementRule.id,
      },
    ],
  });

  await prisma.supplierLedgerEntry.createMany({
    data: [
      {
        companyId: company.id,
        supplierId: supplierHarinas.id,
        entryType: SupplierLedgerEntryType.INVOICE,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        debitAmount: 185000,
        creditAmount: 0,
        balanceAfter: 185000,
        description: "Compra FC-A-0001-00001234 · Compra de harina 000 y aditivos",
        referenceType: "SUPPLIER_INVOICE",
        referenceId: invoiceHarinas.id,
        occurredAt: new Date("2026-03-10T09:00:00Z"),
        dueDate: new Date("2026-03-20T09:00:00Z"),
      },
      {
        companyId: company.id,
        supplierId: supplierHarinas.id,
        entryType: SupplierLedgerEntryType.PAYMENT,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        debitAmount: 0,
        creditAmount: 150000,
        balanceAfter: 35000,
        description: "Pago PAG-0001 · TRX 238019 - pago parcial factura harina.",
        referenceType: "SUPPLIER_PAYMENT",
        referenceId: payment.id,
        occurredAt: new Date("2026-03-18T14:15:00Z"),
      },
      {
        companyId: company.id,
        supplierId: supplierServicios.id,
        entryType: SupplierLedgerEntryType.INVOICE,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        debitAmount: 98000,
        creditAmount: 0,
        balanceAfter: 98000,
        description: "Compra FC-B-0003-00004567 · Mantenimiento de línea de empaque",
        referenceType: "SUPPLIER_INVOICE",
        referenceId: invoiceServicios.id,
        occurredAt: new Date("2026-03-12T11:30:00Z"),
        dueDate: new Date("2026-03-27T11:30:00Z"),
      },
    ],
  });

  await prisma.supplier.update({
    where: { id: supplierHarinas.id },
    data: { currentBalance: 35000 },
  });

  await prisma.supplier.update({
    where: { id: supplierServicios.id },
    data: { currentBalance: 98000 },
  });

  const [clienteDistribuidor, clienteServicios] = await Promise.all([
    prisma.client.create({
      data: {
        companyId: company.id,
        code: "CLI-0001",
        legalName: "Distribuidora Pampeana S.R.L.",
        tradeName: "Pampeana Mayorista",
        clientType: ClientType.COMPANY,
        taxId: "30-70987654-2",
        ivaCondition: FiscalIvaCondition.RESPONSABLE_INSCRIPTO,
        email: "compras@pampeana.local",
        phone: "+54 11 5123 8800",
        commercialAddress: "Av. Mitre 1450, Avellaneda, Buenos Aires",
        fiscalAddress: "Av. Mitre 1450, Avellaneda, Buenos Aires",
        primaryContactName: "Mariela Campos",
        notes: "Cliente mayorista canal AMBA.",
        defaultCurrency: CurrencyCode.ARS,
        receivableAccountId: customerReceivables.id,
      },
    }),
    prisma.client.create({
      data: {
        companyId: company.id,
        code: "CLI-0002",
        legalName: "Río Holding Servicios S.A.",
        tradeName: "Río Servicios",
        clientType: ClientType.COMPANY,
        taxId: "30-74561234-9",
        ivaCondition: FiscalIvaCondition.RESPONSABLE_INSCRIPTO,
        email: "administracion@rioservicios.local",
        phone: "+54 351 432 5500",
        commercialAddress: "Bv. San Juan 850, Córdoba",
        fiscalAddress: "Bv. San Juan 850, Córdoba",
        primaryContactName: "Carolina Méndez",
        defaultCurrency: CurrencyCode.ARS,
        receivableAccountId: customerReceivables.id,
      },
    }),
  ]);

  const fiscalSalesDocument = await prisma.fiscalDocument.create({
    data: {
      companyId: company.id,
      fiscalConfigId: fiscalConfig.id,
      fiscalPointOfSaleId: fiscalPointOfSale.id,
      createdById: owner.id,
      sourceEntityType: "COMMERCIAL_DOCUMENT",
      sourceEntityId: "PENDING-LINK",
      fiscalDocumentType: FiscalDocumentType.FACTURA_A,
      fiscalStatus: FiscalDocumentStatus.READY,
      requestDraft: {
        mode: "draft",
        reason: "Demo de vínculo comercial-fiscal sin emisión electrónica real.",
      },
    },
  });

  const salesDocument = await prisma.commercialDocument.create({
    data: {
      companyId: company.id,
      clientId: clienteDistribuidor.id,
      createdById: owner.id,
      fiscalDocumentId: fiscalSalesDocument.id,
      accountingRuleId: salesDocumentRule.id,
      documentType: CommercialDocumentType.INVOICE,
      documentNumber: "VTA-0001-00000001",
      issueDate: new Date("2026-03-20T13:30:00Z"),
      dueDate: new Date("2026-04-04T13:30:00Z"),
      currency: CurrencyCode.ARS,
      exchangeRate: 1,
      subtotalAmount: 295000,
      taxAmount: 61950,
      totalAmount: 356950,
      openAmount: 156950,
      status: CommercialDocumentStatus.PARTIALLY_PAID,
      isFiscalizable: true,
      notes: "Pedido mayorista marzo.",
      lines: {
        create: [
          {
            companyId: company.id,
            itemId: alfajor.id,
            lineNumber: 1,
            description: "Alfajor cacao 55g caja x 100",
            quantity: 1000,
            unit: "un",
            unitPrice: 295,
            discountAmount: 0,
            subtotalAmount: 295000,
            taxAmount: 61950,
            totalAmount: 356950,
          },
        ],
      },
    },
  });

  await prisma.fiscalDocument.update({
    where: { id: fiscalSalesDocument.id },
    data: {
      sourceEntityId: salesDocument.id,
      externalReference: salesDocument.documentNumber,
    },
  });

  const serviceDocument = await prisma.commercialDocument.create({
    data: {
      companyId: company.id,
      clientId: clienteServicios.id,
      createdById: owner.id,
      accountingRuleId: salesDocumentRule.id,
      documentType: CommercialDocumentType.INVOICE,
      documentNumber: "VTA-0001-00000002",
      issueDate: new Date("2026-03-21T10:15:00Z"),
      dueDate: new Date("2026-03-28T10:15:00Z"),
      currency: CurrencyCode.ARS,
      exchangeRate: 1,
      subtotalAmount: 25000,
      taxAmount: 5250,
      totalAmount: 30250,
      openAmount: 30250,
      status: CommercialDocumentStatus.ISSUED,
      isFiscalizable: false,
      notes: "Servicio logístico de distribución Córdoba capital.",
      lines: {
        create: [
          {
            companyId: company.id,
            itemId: servicioLogistico.id,
            lineNumber: 1,
            description: "Servicio logístico local",
            quantity: 1,
            unit: "servicio",
            unitPrice: 25000,
            discountAmount: 0,
            subtotalAmount: 25000,
            taxAmount: 5250,
            totalAmount: 30250,
          },
        ],
      },
    },
  });

  const receipt = await prisma.commercialReceipt.create({
    data: {
      companyId: company.id,
      clientId: clienteDistribuidor.id,
      createdById: owner.id,
      accountingRuleId: salesReceiptRule.id,
      receiptNumber: "REC-0001-00000001",
      receiptDate: new Date("2026-03-22T16:40:00Z"),
      currency: CurrencyCode.ARS,
      exchangeRate: 1,
      totalAmount: 200000,
      unappliedAmount: 0,
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      reference: "TRX COB-55429",
      notes: "Cobro parcial del comprobante VTA-0001-00000001.",
      status: CommercialReceiptStatus.APPLIED,
    },
  });

  await prisma.commercialReceiptApplication.create({
    data: {
      companyId: company.id,
      commercialReceiptId: receipt.id,
      commercialDocumentId: salesDocument.id,
      appliedAmount: 200000,
      resultingOpenAmount: 156950,
    },
  });

  await prisma.commercialLedgerEntry.createMany({
    data: [
      {
        companyId: company.id,
        clientId: clienteDistribuidor.id,
        commercialDocumentId: salesDocument.id,
        entryType: CommercialLedgerEntryType.DOCUMENT,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        debitAmount: 356950,
        creditAmount: 0,
        balanceAfter: 356950,
        description: "Venta VTA-0001-00000001",
        referenceType: "COMMERCIAL_DOCUMENT",
        referenceId: salesDocument.id,
        occurredAt: new Date("2026-03-20T13:30:00Z"),
        dueDate: new Date("2026-04-04T13:30:00Z"),
      },
      {
        companyId: company.id,
        clientId: clienteDistribuidor.id,
        commercialReceiptId: receipt.id,
        entryType: CommercialLedgerEntryType.RECEIPT,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        debitAmount: 0,
        creditAmount: 200000,
        balanceAfter: 156950,
        description: "Cobranza REC-0001-00000001",
        referenceType: "COMMERCIAL_RECEIPT",
        referenceId: receipt.id,
        occurredAt: new Date("2026-03-22T16:40:00Z"),
      },
      {
        companyId: company.id,
        clientId: clienteServicios.id,
        commercialDocumentId: serviceDocument.id,
        entryType: CommercialLedgerEntryType.DOCUMENT,
        currency: CurrencyCode.ARS,
        exchangeRate: 1,
        debitAmount: 30250,
        creditAmount: 0,
        balanceAfter: 30250,
        description: "Venta VTA-0001-00000002",
        referenceType: "COMMERCIAL_DOCUMENT",
        referenceId: serviceDocument.id,
        occurredAt: new Date("2026-03-21T10:15:00Z"),
        dueDate: new Date("2026-03-28T10:15:00Z"),
      },
    ],
  });

  await prisma.client.update({
    where: { id: clienteDistribuidor.id },
    data: { currentBalance: 156950 },
  });

  await prisma.client.update({
    where: { id: clienteServicios.id },
    data: { currentBalance: 30250 },
  });

  console.log("Seed aplicado con producción, tesorería, fiscal y módulo comercial base preparados.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
