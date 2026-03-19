import {
  BankMovementType,
  CashMovementType,
  CurrencyCode,
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
  await prisma.fileAttachment.deleteMany();
  await prisma.supplierLedgerEntry.deleteMany();
  await prisma.supplierPaymentItem.deleteMany();
  await prisma.cashMovement.deleteMany();
  await prisma.bankMovement.deleteMany();
  await prisma.supplierPayment.deleteMany();
  await prisma.supplierInvoice.deleteMany();
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

  const [harina, azucar, cacao, empaque, alfajor] = await Promise.all([
    prisma.item.create({
      data: {
        companyId: company.id,
        sku: "MP-HAR-0001",
        name: "Harina 000",
        uom: "kg",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 1.45,
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
      },
    }),
  ]);

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
      { companyId: company.id, warehouseId: warehouse.id, itemId: harina.id, movementType: StockMovementType.PRODUCTION_CONSUMPTION, quantity: -8.6, unitCost: 1.45, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:MP-HAR-0001:CONSUMO" },
      { companyId: company.id, warehouseId: warehouse.id, itemId: azucar.id, movementType: StockMovementType.PRODUCTION_CONSUMPTION, quantity: -3.25, unitCost: 1.9, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:MP-AZU-0001:CONSUMO" },
      { companyId: company.id, warehouseId: warehouse.id, itemId: cacao.id, movementType: StockMovementType.PRODUCTION_CONSUMPTION, quantity: -1.17, unitCost: 6.3, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:MP-CAC-0001:CONSUMO" },
      { companyId: company.id, warehouseId: warehouse.id, itemId: empaque.id, movementType: StockMovementType.PRODUCTION_CONSUMPTION, quantity: -102, unitCost: 0.11, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:MP-EMP-0001:CONSUMO" },
      { companyId: company.id, warehouseId: warehouse.id, itemId: alfajor.id, movementType: StockMovementType.PRODUCTION_OUTPUT, quantity: 98, unitCost: 1.35, referenceType: "PRODUCTION_ORDER", referenceId: closedOrder.id, traceCode: "OF-0001:PT-ALF-0012:INGRESO" },
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

  console.log("Seed aplicado con producción, tesorería, pagos a proveedores y cuenta corriente.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
