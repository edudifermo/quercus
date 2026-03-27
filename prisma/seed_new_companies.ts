import {
  BankMovementType,
  CashMovementType,
  ClientType,
  CommercialDocumentStatus,
  CommercialDocumentType,
  CommercialItemType,
  CommercialLedgerEntryType,
  CommercialReceiptStatus,
  CurrencyCode,
  FiscalDocumentStatus,
  FiscalEnvironment,
  FiscalIvaCondition,
  FiscalOperationType,
  FiscalPointOfSaleUse,
  FiscalProcessingStatus,
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
  Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

// ============================================================================
// EMPRESA 1: TEJEDORA DEL SUR - Producción Textil + Tesorería Completa
// ============================================================================

async function seedTejededorDelSur() {
  console.log("🧵 Inicializando: Tejedora del Sur (Empresa Textil)");

  // Crear empresa
  const tejededora = await prisma.company.create({
    data: {
      name: "Tejedora del Sur S.A.",
      slug: "tejedora-sur",
    },
  });

  // Crear usuarios
  const [gerente, operario, contador] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Martín García",
        email: "martin.garcia@tejededora.ar",
      },
    }),
    prisma.user.create({
      data: {
        name: "Carlos López",
        email: "carlos.lopez@tejededora.ar",
      },
    }),
    prisma.user.create({
      data: {
        name: "Patricia Fernández",
        email: "patricia.fernandez@tejededora.ar",
      },
    }),
  ]);

  // Crear membresías
  await prisma.membership.createMany({
    data: [
      { companyId: tejededora.id, userId: gerente.id, role: MembershipRole.OWNER },
      { companyId: tejededora.id, userId: operario.id, role: MembershipRole.OPERATOR },
      { companyId: tejededora.id, userId: contador.id, role: MembershipRole.PLANNER },
    ],
  });

  // Configuración fiscal
  const fiscalConfig = await prisma.fiscalConfig.create({
    data: {
      companyId: tejededora.id,
      cuit: "20233456781",
      legalName: "Tejedora del Sur S.A.",
      ivaCondition: FiscalIvaCondition.RESPONSABLE_INSCRIPTO,
      grossIncomeCondition: GrossIncomeCondition.MULTILATERAL,
      taxAddress: "Ruta Nacional 5 km 120, Dolores, Buenos Aires",
      fiscalEnvironment: FiscalEnvironment.TESTING,
      integrationEnabled: false,
      isActive: true,
      technicalReference: "afip/wsfev1/prod",
      certificateReference: "vault://tejededora/certificate",
      privateKeyReference: "vault://tejededora/private-key",
      integrationParameters: {
        wsaaProfile: "produccion",
        cae_holder: "test-cae",
      },
    },
  });

  // Punto de venta fiscal
  const posVenta = await prisma.fiscalPointOfSale.create({
    data: {
      companyId: tejededora.id,
      fiscalConfigId: fiscalConfig.id,
      pointOfSaleNumber: 1,
      description: "Punto de venta Ventas",
      use: FiscalPointOfSaleUse.SALES,
      active: true,
      metadata: {
        channel: "comercial",
        region: "buenos-aires-sur",
      },
    },
  });

  // Plan contable
  const planContable = await prisma.accountingPlan.create({
    data: {
      code: "PLAN-GENERAL-2024",
      name: "Plan Contable General Textil",
      companyLinks: {
        create: [
          {
            companyId: tejededora.id,
            isActive: true,
            isDefault: true,
          },
        ],
      },
    },
  });

  const companyPlan = await prisma.companyAccountingPlan.findFirst({
    where: { companyId: tejededora.id, plan_code: planContable.code },
  });

  // Crear cuentas contables
  const [
    cajaLocal,
    banco,
    clientesCta,
    proveedoresCta,
    ventasRevenue,
    costoVentas,
    mpInventario,
    wip,
    ptInventario,
    diferidosActivo,
  ] = await Promise.all([
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1010",
        name: "Caja",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1020",
        name: "Banco Provincia",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1200",
        name: "Clientes",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "2100",
        name: "Proveedores",
        category: "LIABILITY",
        nature: "CREDIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "4100",
        name: "Ventas",
        category: "REVENUE",
        nature: "CREDIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "5100",
        name: "Costo de Ventas",
        category: "EXPENSE",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1300",
        name: "Materia Prima",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1310",
        name: "Producto en Proceso",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1320",
        name: "Producto Terminado",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1500",
        name: "Seguros Pagados por Adelantado",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
  ]);

  // Depósitos (almacenes)
  const [deposito1, deposito2] = await Promise.all([
    prisma.warehouse.create({
      data: {
        companyId: tejededora.id,
        code: "PLANTA1",
        name: "Planta Principal (Dolores)",
      },
    }),
    prisma.warehouse.create({
      data: {
        companyId: tejededora.id,
        code: "PT-TERM",
        name: "Depósito Producto Terminado",
      },
    }),
  ]);

  // Productos: Materias Primas
  const [algodon, hilo, teñidor, pegamento] = await Promise.all([
    prisma.item.create({
      data: {
        companyId: tejededora.id,
        sku: "MP-ALG-FINA",
        name: "Algodón fino importado",
        uom: "kg",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 12.5,
        inventoryAccountId: mpInventario.id,
      },
    }),
    prisma.item.create({
      data: {
        companyId: tejededora.id,
        sku: "MP-HIL-PQTE",
        name: "Hilo de poliéster",
        uom: "paquete",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 4.2,
        inventoryAccountId: mpInventario.id,
      },
    }),
    prisma.item.create({
      data: {
        companyId: tejededora.id,
        sku: "MP-TEÑ-LT",
        name: "Teñidor químico litro",
        uom: "litro",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 25.0,
        inventoryAccountId: mpInventario.id,
      },
    }),
    prisma.item.create({
      data: {
        companyId: tejededora.id,
        sku: "MP-PEG-KG",
        name: "Pegamento industrial",
        uom: "kg",
        itemType: ItemType.RAW_MATERIAL,
        standardCost: 8.75,
        inventoryAccountId: mpInventario.id,
      },
    }),
  ]);

  // Productos Terminados
  const [tela_algodon, tela_fina, tela_jaspeada] = await Promise.all([
    prisma.item.create({
      data: {
        companyId: tejededora.id,
        sku: "PT-ALGODON-160",
        name: "Tela Algodón 160cm ancho",
        uom: "metro",
        itemType: ItemType.FINISHED_GOOD,
        isManufacturable: true,
        standardCost: 28.5,
        inventoryAccountId: ptInventario.id,
        salesAccountId: ventasRevenue.id,
        commercialItemType: CommercialItemType.PRODUCT,
        isCommercialSellable: true,
        defaultSalePrice: 45.0,
      },
    }),
    prisma.item.create({
      data: {
        companyId: tejededora.id,
        sku: "PT-FINA-140",
        name: "Tela Fina estampada 140cm",
        uom: "metro",
        itemType: ItemType.FINISHED_GOOD,
        isManufacturable: true,
        standardCost: 35.8,
        inventoryAccountId: ptInventario.id,
        salesAccountId: ventasRevenue.id,
        commercialItemType: CommercialItemType.PRODUCT,
        isCommercialSellable: true,
        defaultSalePrice: 58.5,
      },
    }),
    prisma.item.create({
      data: {
        companyId: tejededora.id,
        sku: "PT-JASP-170",
        name: "Tela Jaspeada 170cm ancho",
        uom: "metro",
        itemType: ItemType.FINISHED_GOOD,
        isManufacturable: true,
        standardCost: 42.3,
        inventoryAccountId: ptInventario.id,
        salesAccountId: ventasRevenue.id,
        commercialItemType: CommercialItemType.PRODUCT,
        isCommercialSellable: true,
        defaultSalePrice: 68.0,
      },
    }),
  ]);

  // BOMs (Estructuras de Productos)
  const bomAlgodon = await prisma.bom.create({
    data: {
      companyId: tejededora.id,
      finishedItemId: tela_algodon.id,
      code: "BOM-ALG-160",
      version: 1,
      baseQuantity: 100,
      notes: "Producción de tela algodón 100 metros",
      lines: {
        create: [
          { componentItemId: algodon.id, quantity: 115, scrapRate: 0.12 },
          { componentItemId: hilo.id, quantity: 20, scrapRate: 0.05 },
        ],
      },
    },
    include: { lines: true },
  });

  const bomFina = await prisma.bom.create({
    data: {
      companyId: tejededora.id,
      finishedItemId: tela_fina.id,
      code: "BOM-FINA-140",
      version: 1,
      baseQuantity: 80,
      notes: "Producción de tela fina con estampado",
      lines: {
        create: [
          { componentItemId: algodon.id, quantity: 95, scrapRate: 0.1 },
          { componentItemId: hilo.id, quantity: 16, scrapRate: 0.08 },
          { componentItemId: teñidor.id, quantity: 2, scrapRate: 0.02 },
          { componentItemId: pegamento.id, quantity: 1.5, scrapRate: 0.01 },
        ],
      },
    },
    include: { lines: true },
  });

  // Stock Inicial
  await prisma.stockMovement.createMany({
    data: [
      {
        companyId: tejededora.id,
        warehouseId: deposito1.id,
        itemId: algodon.id,
        movementType: StockMovementType.OPENING,
        quantity: 800,
        unitCost: 12.5,
        referenceType: "OPENING",
        referenceId: "seed",
        traceCode: "OPENING:ALG",
      },
      {
        companyId: tejededora.id,
        warehouseId: deposito1.id,
        itemId: hilo.id,
        movementType: StockMovementType.OPENING,
        quantity: 250,
        unitCost: 4.2,
        referenceType: "OPENING",
        referenceId: "seed",
        traceCode: "OPENING:HIL",
      },
      {
        companyId: tejededora.id,
        warehouseId: deposito1.id,
        itemId: teñidor.id,
        movementType: StockMovementType.OPENING,
        quantity: 40,
        unitCost: 25.0,
        referenceType: "OPENING",
        referenceId: "seed",
        traceCode: "OPENING:TEÑ",
      },
      {
        companyId: tejededora.id,
        warehouseId: deposito1.id,
        itemId: pegamento.id,
        movementType: StockMovementType.OPENING,
        quantity: 50,
        unitCost: 8.75,
        referenceType: "OPENING",
        referenceId: "seed",
        traceCode: "OPENING:PEG",
      },
      {
        companyId: tejededora.id,
        warehouseId: deposito2.id,
        itemId: tela_algodon.id,
        movementType: StockMovementType.OPENING,
        quantity: 300,
        unitCost: 28.5,
        referenceType: "OPENING",
        referenceId: "seed",
        traceCode: "OPENING:PT-ALG",
      },
      {
        companyId: tejededora.id,
        warehouseId: deposito2.id,
        itemId: tela_fina.id,
        movementType: StockMovementType.OPENING,
        quantity: 150,
        unitCost: 35.8,
        referenceType: "OPENING",
        referenceId: "seed",
        traceCode: "OPENING:PT-FINA",
      },
    ],
  });

  // Órdenes de Fabricación
  const of1 = await prisma.productionOrder.create({
    data: {
      companyId: tejededora.id,
      code: "OF-2026-0001",
      bomId: bomAlgodon.id,
      finishedItemId: tela_algodon.id,
      warehouseId: deposito1.id,
      status: ProductionOrderStatus.RELEASED,
      plannedQuantity: 250,
      expectedOutputQty: 250,
      producedQuantity: 0,
      scrapQuantity: 0,
      notes: "Orden semanal de tela algodón 160cm",
      createdById: gerente.id,
      requirements: {
        create: [
          { componentItemId: algodon.id, theoreticalQuantity: 287.5, availableQuantity: 800, shortageQuantity: 0 },
          { componentItemId: hilo.id, theoreticalQuantity: 50, availableQuantity: 250, shortageQuantity: 0 },
        ],
      },
    },
  });

  const of2 = await prisma.productionOrder.create({
    data: {
      companyId: tejededora.id,
      code: "OF-2026-0002",
      bomId: bomFina.id,
      finishedItemId: tela_fina.id,
      warehouseId: deposito1.id,
      status: ProductionOrderStatus.DRAFT,
      plannedQuantity: 120,
      expectedOutputQty: 120,
      producedQuantity: 0,
      scrapQuantity: 0,
      notes: "Orden especial tela fina con estampado",
      createdById: gerente.id,
      requirements: {
        create: [
          { componentItemId: algodon.id, theoreticalQuantity: 114, availableQuantity: 800, shortageQuantity: 0 },
          { componentItemId: hilo.id, theoreticalQuantity: 19.2, availableQuantity: 250, shortageQuantity: 0 },
          { componentItemId: teñidor.id, theoreticalQuantity: 2.4, availableQuantity: 40, shortageQuantity: 0 },
          { componentItemId: pegamento.id, theoreticalQuantity: 1.8, availableQuantity: 50, shortageQuantity: 0 },
        ],
      },
    },
  });

  // Clientes
  const [cliente1, cliente2, cliente3] = await Promise.all([
    prisma.client.create({
      data: {
        companyId: tejededora.id,
        code: "CL-001",
        legalName: "Confecciones García S.R.L.",
        clientType: ClientType.COMPANY,
        commercialAddress: "Av. Rivadavia 2450, La Plata",
        email: "ventas@confgarcia.com.ar",
        defaultCurrency: CurrencyCode.ARS,
        isActive: true,
        receivableAccountId: clientesCta.id,
        currentBalance: new Prisma.Decimal(0),
      },
    }),
    prisma.client.create({
      data: {
        companyId: tejededora.id,
        code: "CL-002",
        legalName: "Tiendas Deportivas López",
        clientType: ClientType.COMPANY,
        commercialAddress: "Calle 8 nº 2150, La Plata",
        email: "compras@tiendaslopez.com.ar",
        defaultCurrency: CurrencyCode.ARS,
        isActive: true,
        receivableAccountId: clientesCta.id,
        currentBalance: new Prisma.Decimal(0),
      },
    }),
    prisma.client.create({
      data: {
        companyId: tejededora.id,
        code: "CL-003",
        legalName: "Mayorista Textil Sudamericano",
        clientType: ClientType.COMPANY,
        commercialAddress: "Av. Belgrano 1500, CABA",
        email: "pedidos@mayortexsud.com.ar",
        defaultCurrency: CurrencyCode.ARS,
        isActive: true,
        receivableAccountId: clientesCta.id,
        currentBalance: new Prisma.Decimal(0),
      },
    }),
  ]);

  // Cajas
  const cajaPlanta = await prisma.cashBox.create({
    data: {
      companyId: tejededora.id,
      code: "CAJA-PLANTA",
      name: "Caja Planta Principal",
      accountingAccountId: cajaLocal.id,
      currency: CurrencyCode.ARS,
      active: true,
    },
  });

  // Cuentas bancarias
  const bancoProvincia = await prisma.bankAccount.create({
    data: {
      companyId: tejededora.id,
      code: "BANCO-PROV-001",
      name: "Banco Provincia - Cuenta Corriente",
      bankCode: "0170",
      branchCode: "00001",
      accountNumber: "1234567890",
      accountingAccountId: banco.id,
      currency: CurrencyCode.ARS,
      active: true,
    },
  });

  // Movimientos de Caja (Apertura)
  await prisma.cashMovement.create({
    data: {
      companyId: tejededora.id,
      cashBoxId: cajaPlanta.id,
      movementType: CashMovementType.OPENING,
      amount: new Prisma.Decimal(15000),
      direction: TreasuryMovementDirection.IN,
      description: "Fondo inicial de caja",
      referenceType: "OPENING",
      referenceId: "seed",
      recordedAt: new Date("2026-03-01"),
      recordedById: gerente.id,
    },
  });

  // Movimientos Bancarios (Apertura)
  await prisma.bankMovement.create({
    data: {
      companyId: tejededora.id,
      bankAccountId: bancoProvincia.id,
      movementType: BankMovementType.OPENING,
      amount: new Prisma.Decimal(50000),
      direction: TreasuryMovementDirection.IN,
      description: "Saldo inicial banco",
      referenceType: "OPENING",
      referenceId: "seed",
      recordedAt: new Date("2026-03-01"),
      recordedById: gerente.id,
    },
  });

  // Facturación Comercial: Documento sin aplicar
  const doc1 = await prisma.commercialDocument.create({
    data: {
      companyId: tejededora.id,
      clientId: cliente1.id,
      createdById: gerente.id,
      documentType: CommercialDocumentType.INVOICE,
      documentNumber: "FC-A-0001-00000001",
      issueDate: new Date("2026-03-15"),
      dueDate: new Date("2026-04-15"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      status: CommercialDocumentStatus.ISSUED,
      isFiscalizable: true,
      subtotalAmount: new Prisma.Decimal(3600),
      taxAmount: new Prisma.Decimal(750),
      totalAmount: new Prisma.Decimal(4350),
      openAmount: new Prisma.Decimal(4350),
      lines: {
        create: [
          {
            companyId: tejededora.id,
            itemId: tela_algodon.id,
            lineNumber: 1,
            description: "Tela Algodón 160cm, rollo de 65 metros",
            quantity: new Prisma.Decimal(65),
            unit: "metro",
            unitPrice: new Prisma.Decimal(45),
            discountAmount: new Prisma.Decimal(0),
            subtotalAmount: new Prisma.Decimal(2925),
            taxAmount: new Prisma.Decimal(607.5),
            totalAmount: new Prisma.Decimal(3532.5),
          },
          {
            companyId: tejededora.id,
            itemId: tela_fina.id,
            lineNumber: 2,
            description: "Tela Fina estampada 140cm, rollo de 25 metros",
            quantity: new Prisma.Decimal(25),
            unit: "metro",
            unitPrice: new Prisma.Decimal(58.5),
            discountAmount: new Prisma.Decimal(0),
            subtotalAmount: new Prisma.Decimal(675),
            taxAmount: new Prisma.Decimal(140.25),
            totalAmount: new Prisma.Decimal(817.5),
          },
        ],
      },
    },
  });

  // Cobranza parcial: 50% del primer documento
  const cobranza1 = await prisma.commercialReceipt.create({
    data: {
      companyId: tejededora.id,
      clientId: cliente1.id,
      createdById: gerente.id,
      receiptNumber: "REC-20260318-001",
      receiptDate: new Date("2026-03-18"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      totalAmount: new Prisma.Decimal(2175),
      unappliedAmount: new Prisma.Decimal(0),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      reference: "Transferencia Banco Provincia",
      status: CommercialReceiptStatus.POSTED,
      applications: {
        create: [
          {
            companyId: tejededora.id,
            commercialDocumentId: doc1.id,
            appliedAmount: new Prisma.Decimal(2175),
            resultingOpenAmount: new Prisma.Decimal(2175),
          },
        ],
      },
    },
  });

  // Actualizar documento
  await prisma.commercialDocument.update({
    where: { id: doc1.id },
    data: {
      openAmount: new Prisma.Decimal(2175),
      status: CommercialDocumentStatus.PARTIAL,
    },
  });

  // Movimiento bancario: depósito de cobranza
  await prisma.bankMovement.create({
    data: {
      companyId: tejededora.id,
      bankAccountId: bancoProvincia.id,
      movementType: BankMovementType.DEPOSIT,
      amount: new Prisma.Decimal(2175),
      direction: TreasuryMovementDirection.IN,
      description: "Cobranza Confecciones García",
      referenceType: "COMMERCIAL_RECEIPT",
      referenceId: cobranza1.id,
      recordedAt: new Date("2026-03-18"),
      recordedById: gerente.id,
    },
  });

  // Proveedor
  const proveedor = await prisma.supplier.create({
    data: {
      companyId: tejededora.id,
      code: "PROV-001",
      legalName: "Algodones Brasileños S.A.",
      supplierType: ClientType.COMPANY,
      commercialAddress: "Rua Industrial 450, São Paulo, Brasil",
      email: "ventas@algobras.com.br",
      defaultCurrency: CurrencyCode.USD,
      isActive: true,
      payableAccountId: proveedoresCta.id,
      currentBalance: new Prisma.Decimal(0),
    },
  });

  // Factura de proveedor
  const facturaSupl = await prisma.supplierInvoice.create({
    data: {
      companyId: tejededora.id,
      supplierId: proveedor.id,
      invoiceNumber: "FA-001-123456",
      invoiceDate: new Date("2026-03-10"),
      dueDate: new Date("2026-04-10"),
      currency: CurrencyCode.USD,
      exchangeRate: new Prisma.Decimal(45.5),
      subtotalAmount: new Prisma.Decimal(500),
      taxAmount: new Prisma.Decimal(100),
      totalAmount: new Prisma.Decimal(600),
      openAmount: new Prisma.Decimal(600),
      status: SupplierDocumentStatus.OPEN,
    },
  });

  // Pago a proveedor
  const pagoSupl = await prisma.supplierPayment.create({
    data: {
      companyId: tejededora.id,
      supplierId: proveedor.id,
      paymentDate: new Date("2026-03-20"),
      currency: CurrencyCode.USD,
      exchangeRate: new Prisma.Decimal(45.8),
      totalAmount: new Prisma.Decimal(300),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      reference: "Pago parcial FA-001-123456",
      status: SupplierDocumentStatus.OPEN,
      items: {
        create: [
          {
            supplierId: proveedor.id,
            supplierInvoiceId: facturaSupl.id,
            supplierInvoiceNumber: "FA-001-123456",
            appliedAmount: new Prisma.Decimal(300),
          },
        ],
      },
    },
  });

  // Movimiento bancario: pago a proveedor
  await prisma.bankMovement.create({
    data: {
      companyId: tejededora.id,
      bankAccountId: bancoProvincia.id,
      movementType: BankMovementType.PAYMENT,
      amount: new Prisma.Decimal(13740),
      direction: TreasuryMovementDirection.OUT,
      description: "Pago a Algodones Brasileños (USD 300 @ 45.80)",
      referenceType: "SUPPLIER_PAYMENT",
      referenceId: pagoSupl.id,
      recordedAt: new Date("2026-03-20"),
      recordedById: gerente.id,
    },
  });

  // Movimiento de caja: egreso por gastos
  await prisma.cashMovement.create({
    data: {
      companyId: tejededora.id,
      cashBoxId: cajaPlanta.id,
      movementType: CashMovementType.PAYMENT,
      amount: new Prisma.Decimal(2500),
      direction: TreasuryMovementDirection.OUT,
      description: "Pago servicios planta (electricidad, agua)",
      referenceType: "EXPENSE",
      referenceId: "UTIL-MAR-2026",
      recordedAt: new Date("2026-03-20"),
      recordedById: operario.id,
    },
  });

  // Movimiento bancario: comisión
  await prisma.bankMovement.create({
    data: {
      companyId: tejededora.id,
      bankAccountId: bancoProvincia.id,
      movementType: BankMovementType.FEE,
      amount: new Prisma.Decimal(150),
      direction: TreasuryMovementDirection.OUT,
      description: "Comisión mensual banco",
      referenceType: "BANK_FEE",
      referenceId: "FEE-MAR-2026",
      recordedAt: new Date("2026-03-25"),
      recordedById: contador.id,
    },
  });

  console.log("✅ Tejedora del Sur creada exitosamente");
  return tejededora;
}

// ============================================================================
// EMPRESA 2: TIEMPODESGURO.COM.AR - Facturación Fiscal + Cuenta Corriente + Tesorería
// ============================================================================

async function seedTiempodeSeguro() {
  console.log("📱 Inicializando: tiempodesguro.com.ar (Publicidad Digital)");

  // Crear empresa
  const tiempodesguro = await prisma.company.create({
    data: {
      name: "Tiempodesguro.com.ar S.A.",
      slug: "tiempodesguro-com-ar",
    },
  });

  // Crear usuarios
  const [director, ejecutivo, contable] = await Promise.all([
    prisma.user.create({
      data: {
        name: "Diego Morales",
        email: "diego.morales@tiempodesguro.com.ar",
      },
    }),
    prisma.user.create({
      data: {
        name: "Verónica Acosta",
        email: "verónica.acosta@tiempodesguro.com.ar",
      },
    }),
    prisma.user.create({
      data: {
        name: "Roberto Simón",
        email: "roberto.simon@tiempodesguro.com.ar",
      },
    }),
  ]);

  // Crear membresías
  await prisma.membership.createMany({
    data: [
      { companyId: tiempodesguro.id, userId: director.id, role: MembershipRole.OWNER },
      { companyId: tiempodesguro.id, userId: ejecutivo.id, role: MembershipRole.OPERATOR },
      { companyId: tiempodesguro.id, userId: contable.id, role: MembershipRole.PLANNER },
    ],
  });

  // Configuración fiscal - GRAN CONTRIBUYENTE (por monto facturado)
  const fiscalConfig = await prisma.fiscalConfig.create({
    data: {
      companyId: tiempodesguro.id,
      cuit: "20289776553",
      legalName: "TIEMPODESGURO.COM.AR S.A.",
      ivaCondition: FiscalIvaCondition.RESPONSABLE_INSCRIPTO,
      grossIncomeCondition: GrossIncomeCondition.GRAN_CONTRIBUYENTE,
      taxAddress: "Av. Santa Fe 4545, Piso 12, Recoleta, CABA",
      fiscalEnvironment: FiscalEnvironment.TESTING,
      integrationEnabled: true,
      isActive: true,
      technicalReference: "afip/wsfev1/prod",
      certificateReference: "vault://tiempodesguro/cert-prod",
      privateKeyReference: "vault://tiempodesguro/key-prod",
      integrationParameters: {
        wsaaProfile: "produccion",
        cae_validity_days: 30,
      },
    },
  });

  // Dos puntos de venta
  const [posVenta, posNc] = await Promise.all([
    prisma.fiscalPointOfSale.create({
      data: {
        companyId: tiempodesguro.id,
        fiscalConfigId: fiscalConfig.id,
        pointOfSaleNumber: 1,
        description: "Punto 001 - Ventas Digitales",
        use: FiscalPointOfSaleUse.SALES,
        active: true,
        metadata: {
          channel: "web-api",
          region: "online",
        },
      },
    }),
    prisma.fiscalPointOfSale.create({
      data: {
        companyId: tiempodesguro.id,
        fiscalConfigId: fiscalConfig.id,
        pointOfSaleNumber: 2,
        description: "Punto 002 - Notas de Crédito",
        use: FiscalPointOfSaleUse.SALES,
        active: true,
        metadata: {
          channel: "rectificaciones",
        },
      },
    }),
  ]);

  // Plan contable
  const planContable = await prisma.accountingPlan.create({
    data: {
      code: "PLAN-DIGITAL-SVCS",
      name: "Plan Contable Servicios Digitales",
      companyLinks: {
        create: [
          {
            companyId: tiempodesguro.id,
            isActive: true,
            isDefault: true,
          },
        ],
      },
    },
  });

  // Cuentas contables
  const [
    efectivo,
    cuentaBanco,
    ctasClientes,
    ingresosPub,
    ingresoComisiones,
    ingresoOtros,
    pagosSrv,
    impuestos,
  ] = await Promise.all([
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1010",
        name: "Caja",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1020",
        name: "Bancos",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "1200",
        name: "Clientes",
        category: "ASSET",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "4100",
        name: "Ingresos por Publicidad",
        category: "REVENUE",
        nature: "CREDIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "4200",
        name: "Ingresos por Comisiones",
        category: "REVENUE",
        nature: "CREDIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "4900",
        name: "Otros Ingresos",
        category: "REVENUE",
        nature: "CREDIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "5100",
        name: "Gastos por Servicios",
        category: "EXPENSE",
        nature: "DEBIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
    prisma.accountingAccount.create({
      data: {
        planId: planContable.id,
        code: "2150",
        name: "Impuestos a Pagar",
        category: "LIABILITY",
        nature: "CREDIT",
        isActive: true,
        allowsDirectPosting: true,
      },
    }),
  ]);

  // Depósito (No es textil, pero para manejar estructura)
  const deposito = await prisma.warehouse.create({
    data: {
      companyId: tiempodesguro.id,
      code: "DIGITAL",
      name: "Depósito Digital (Activos Intangibles)",
    },
  });

  // Servicios/Productos (Servicios digitales)
  const [
    paqueteBasico,
    paquetePremium,
    servicioBoost,
    servicioAnalytics,
  ] = await Promise.all([
    prisma.item.create({
      data: {
        companyId: tiempodesguro.id,
        sku: "SRV-BASE",
        name: "Paquete Básico",
        uom: "mes",
        itemType: ItemType.SERVICE,
        commercialItemType: CommercialItemType.SERVICE,
        isCommercialSellable: true,
        defaultSalePrice: 1500,
        salesAccountId: ingresosPub.id,
        standardCost: 0,
      },
    }),
    prisma.item.create({
      data: {
        companyId: tiempodesguro.id,
        sku: "SRV-PREM",
        name: "Paquete Premium",
        uom: "mes",
        itemType: ItemType.SERVICE,
        commercialItemType: CommercialItemType.SERVICE,
        isCommercialSellable: true,
        defaultSalePrice: 4500,
        salesAccountId: ingresosPub.id,
        standardCost: 0,
      },
    }),
    prisma.item.create({
      data: {
        companyId: tiempodesguro.id,
        sku: "SRV-BOOST",
        name: "Servicio Boost de Impresiones",
        uom: "servicio",
        itemType: ItemType.SERVICE,
        commercialItemType: CommercialItemType.SERVICE,
        isCommercialSellable: true,
        defaultSalePrice: 3000,
        salesAccountId: ingresosPub.id,
        standardCost: 0,
      },
    }),
    prisma.item.create({
      data: {
        companyId: tiempodesguro.id,
        sku: "SRV-ANALYTICS",
        name: "Servicio Analytics Avanzado",
        uom: "mes",
        itemType: ItemType.SERVICE,
        commercialItemType: CommercialItemType.SERVICE,
        isCommercialSellable: true,
        defaultSalePrice: 2200,
        salesAccountId: ingresosPub.id,
        standardCost: 0,
      },
    }),
  ]);

  // Stock inicial (sólo para estructura, sin cantidad real en digital)
  await prisma.stockMovement.create({
    data: {
      companyId: tiempodesguro.id,
      warehouseId: deposito.id,
      itemId: paqueteBasico.id,
      movementType: StockMovementType.OPENING,
      quantity: 1000,
      unitCost: 0,
      referenceType: "OPENING",
      referenceId: "seed",
      traceCode: "OPENING:DIGITAL",
    },
  });

  // Clientes (Anunciantes)
  const [anunciante1, anunciante2, anunciante3, agencia] = await Promise.all([
    prisma.client.create({
      data: {
        companyId: tiempodesguro.id,
        code: "ANC-001",
        legalName: "Seguros La Pampa S.A.",
        taxId: "20289776554",
        clientType: ClientType.COMPANY,
        commercialAddress: "Av. Rivadavia 1450, La Pampa",
        email: "marketing@seguros-lampampa.com.ar",
        defaultCurrency: CurrencyCode.ARS,
        isActive: true,
        receivableAccountId: ctasClientes.id,
        currentBalance: new Prisma.Decimal(0),
      },
    }),
    prisma.client.create({
      data: {
        companyId: tiempodesguro.id,
        code: "ANC-002",
        legalName: "Inmobiliaria Horizonte",
        taxId: "20278945612",
        clientType: ClientType.COMPANY,
        commercialAddress: "Calle Principal 850, CABA",
        email: "publicidad@inmobiliariahoriz.com.ar",
        defaultCurrency: CurrencyCode.ARS,
        isActive: true,
        receivableAccountId: ctasClientes.id,
        currentBalance: new Prisma.Decimal(0),
      },
    }),
    prisma.client.create({
      data: {
        companyId: tiempodesguro.id,
        code: "ANC-003",
        legalName: "Financiera Digital Plus",
        taxId: "20312456789",
        clientType: ClientType.COMPANY,
        commercialAddress: "Microcentro, CABA",
        email: "cuenta@findigitalplus.com.ar",
        defaultCurrency: CurrencyCode.ARS,
        isActive: true,
        receivableAccountId: ctasClientes.id,
        currentBalance: new Prisma.Decimal(0),
      },
    }),
    prisma.client.create({
      data: {
        companyId: tiempodesguro.id,
        code: "AGC-001",
        legalName: "Agencia de Medios Interactive",
        taxId: "23234567890",
        clientType: ClientType.COMPANY,
        commercialAddress: "San Martín 500 Piso 4, CABA",
        email: "cuentas@mediainteractive.com.ar",
        defaultCurrency: CurrencyCode.ARS,
        isActive: true,
        receivableAccountId: ctasClientes.id,
        currentBalance: new Prisma.Decimal(0),
      },
    }),
  ]);

  // Cajas y bancos
  const cajaDigital = await prisma.cashBox.create({
    data: {
      companyId: tiempodesguro.id,
      code: "CTL",
      name: "Caja de Control",
      accountingAccountId: efectivo.id,
      currency: CurrencyCode.ARS,
      active: true,
    },
  });

  const bancoItau = await prisma.bankAccount.create({
    data: {
      companyId: tiempodesguro.id,
      code: "ITAU-CC-001",
      name: "Itaú - Cuenta Corriente Empresa",
      bankCode: "0290",
      branchCode: "010",
      accountNumber: "9876543210",
      accountingAccountId: cuentaBanco.id,
      currency: CurrencyCode.ARS,
      active: true,
    },
  });

  // Apertura tesorería
  await prisma.cashMovement.create({
    data: {
      companyId: tiempodesguro.id,
      cashBoxId: cajaDigital.id,
      movementType: CashMovementType.OPENING,
      amount: new Prisma.Decimal(25000),
      direction: TreasuryMovementDirection.IN,
      description: "Fondo inicial de operaciones",
      referenceType: "OPENING",
      referenceId: "seed",
      recordedAt: new Date("2026-02-01"),
      recordedById: director.id,
    },
  });

  await prisma.bankMovement.create({
    data: {
      companyId: tiempodesguro.id,
      bankAccountId: bancoItau.id,
      movementType: BankMovementType.OPENING,
      amount: new Prisma.Decimal(150000),
      direction: TreasuryMovementDirection.IN,
      description: "Capital inicial trasferido",
      referenceType: "OPENING",
      referenceId: "seed",
      recordedAt: new Date("2026-02-01"),
      recordedById: director.id,
    },
  });

  // Facturación fiscal: documento grande
  const factura1 = await prisma.commercialDocument.create({
    data: {
      companyId: tiempodesguro.id,
      clientId: anunciante1.id,
      createdById: ejecutivo.id,
      documentType: CommercialDocumentType.INVOICE,
      documentNumber: "FC-A-0001-00000050",
      issueDate: new Date("2026-03-01"),
      dueDate: new Date("2026-03-31"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      status: CommercialDocumentStatus.ISSUED,
      isFiscalizable: true,
      subtotalAmount: new Prisma.Decimal(18000),
      taxAmount: new Prisma.Decimal(3780),
      totalAmount: new Prisma.Decimal(21780),
      openAmount: new Prisma.Decimal(21780),
      lines: {
        create: [
          {
            companyId: tiempodesguro.id,
            itemId: paquetePremium.id,
            lineNumber: 1,
            description: "Paquete Premium - Mes 3 (Seguros La Pampa)",
            quantity: new Prisma.Decimal(4),
            unit: "mes",
            unitPrice: new Prisma.Decimal(4500),
            discountAmount: new Prisma.Decimal(0),
            subtotalAmount: new Prisma.Decimal(18000),
            taxAmount: new Prisma.Decimal(3780),
            totalAmount: new Prisma.Decimal(21780),
          },
        ],
      },
    },
  });

  // Factura 2: Agencia
  const factura2 = await prisma.commercialDocument.create({
    data: {
      companyId: tiempodesguro.id,
      clientId: agencia.id,
      createdById: ejecutivo.id,
      documentType: CommercialDocumentType.INVOICE,
      documentNumber: "FC-A-0001-00000051",
      issueDate: new Date("2026-03-05"),
      dueDate: new Date("2026-04-05"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      status: CommercialDocumentStatus.ISSUED,
      isFiscalizable: true,
      subtotalAmount: new Prisma.Decimal(15000),
      taxAmount: new Prisma.Decimal(3150),
      totalAmount: new Prisma.Decimal(18150),
      openAmount: new Prisma.Decimal(18150),
      lines: {
        create: [
          {
            companyId: tiempodesguro.id,
            itemId: paqueteBasico.id,
            lineNumber: 1,
            description: "Paquete Básico para 5 clientes finales",
            quantity: new Prisma.Decimal(10),
            unit: "mes",
            unitPrice: new Prisma.Decimal(1500),
            discountAmount: new Prisma.Decimal(0),
            subtotalAmount: new Prisma.Decimal(15000),
            taxAmount: new Prisma.Decimal(3150),
            totalAmount: new Prisma.Decimal(18150),
          },
        ],
      },
    },
  });

  // Factura 3: pago completo
  const factura3 = await prisma.commercialDocument.create({
    data: {
      companyId: tiempodesguro.id,
      clientId: anunciante2.id,
      createdById: director.id,
      documentType: CommercialDocumentType.INVOICE,
      documentNumber: "FC-A-0001-00000052",
      issueDate: new Date("2026-03-10"),
      dueDate: new Date("2026-04-10"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      status: CommercialDocumentStatus.PAID,
      isFiscalizable: true,
      subtotalAmount: new Prisma.Decimal(7000),
      taxAmount: new Prisma.Decimal(1470),
      totalAmount: new Prisma.Decimal(8470),
      openAmount: new Prisma.Decimal(0),
      lines: {
        create: [
          {
            companyId: tiempodesguro.id,
            itemId: servicioBoost.id,
            lineNumber: 1,
            description: "Boost Impresiones - Inmobiliaria Horizonte",
            quantity: new Prisma.Decimal(1),
            unit: "servicio",
            unitPrice: new Prisma.Decimal(7000),
            discountAmount: new Prisma.Decimal(0),
            subtotalAmount: new Prisma.Decimal(7000),
            taxAmount: new Prisma.Decimal(1470),
            totalAmount: new Prisma.Decimal(8470),
          },
        ],
      },
    },
  });

  // Cobranza 1: Seguros La Pampa - pago completo
  const cobranza1 = await prisma.commercialReceipt.create({
    data: {
      companyId: tiempodesguro.id,
      clientId: anunciante1.id,
      createdById: director.id,
      receiptNumber: "REC-20260315-001",
      receiptDate: new Date("2026-03-15"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      totalAmount: new Prisma.Decimal(21780),
      unappliedAmount: new Prisma.Decimal(0),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      reference: "Transferencia bancaria",
      status: CommercialReceiptStatus.POSTED,
      applications: {
        create: [
          {
            companyId: tiempodesguro.id,
            commercialDocumentId: factura1.id,
            appliedAmount: new Prisma.Decimal(21780),
            resultingOpenAmount: new Prisma.Decimal(0),
          },
        ],
      },
    },
  });

  // Actualizar factura 1
  await prisma.commercialDocument.update({
    where: { id: factura1.id },
    data: {
      openAmount: new Prisma.Decimal(0),
      status: CommercialDocumentStatus.PAID,
    },
  });

  // Cobranza 2: Agencia - pago parcial 50%
  const cobranza2 = await prisma.commercialReceipt.create({
    data: {
      companyId: tiempodesguro.id,
      clientId: agencia.id,
      createdById: ejecutivo.id,
      receiptNumber: "REC-20260320-002",
      receiptDate: new Date("2026-03-20"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      totalAmount: new Prisma.Decimal(9075),
      unappliedAmount: new Prisma.Decimal(0),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      reference: "Transferencia Itaú",
      status: CommercialReceiptStatus.POSTED,
      applications: {
        create: [
          {
            companyId: tiempodesguro.id,
            commercialDocumentId: factura2.id,
            appliedAmount: new Prisma.Decimal(9075),
            resultingOpenAmount: new Prisma.Decimal(9075),
          },
        ],
      },
    },
  });

  // Actualizar factura 2
  await prisma.commercialDocument.update({
    where: { id: factura2.id },
    data: {
      openAmount: new Prisma.Decimal(9075),
      status: CommercialDocumentStatus.PARTIAL,
    },
  });

  // Cobranza 3: Inmobiliaria Horizonte
  await prisma.commercialReceipt.create({
    data: {
      companyId: tiempodesguro.id,
      clientId: anunciante2.id,
      createdById: director.id,
      receiptNumber: "REC-20260310-003",
      receiptDate: new Date("2026-03-10"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      totalAmount: new Prisma.Decimal(8470),
      unappliedAmount: new Prisma.Decimal(0),
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      reference: "Depósito automático",
      status: CommercialReceiptStatus.POSTED,
      applications: {
        create: [
          {
            companyId: tiempodesguro.id,
            commercialDocumentId: factura3.id,
            appliedAmount: new Prisma.Decimal(8470),
            resultingOpenAmount: new Prisma.Decimal(0),
          },
        ],
      },
    },
  });

  // Movimientos bancarios: cobranzas
  await prisma.bankMovement.create({
    data: {
      companyId: tiempodesguro.id,
      bankAccountId: bancoItau.id,
      movementType: BankMovementType.DEPOSIT,
      amount: new Prisma.Decimal(21780),
      direction: TreasuryMovementDirection.IN,
      description: "Cobranza Seguros La Pampa - Premium 4 meses",
      referenceType: "COMMERCIAL_RECEIPT",
      referenceId: cobranza1.id,
      recordedAt: new Date("2026-03-15"),
      recordedById: director.id,
    },
  });

  await prisma.bankMovement.create({
    data: {
      companyId: tiempodesguro.id,
      bankAccountId: bancoItau.id,
      movementType: BankMovementType.DEPOSIT,
      amount: new Prisma.Decimal(9075),
      direction: TreasuryMovementDirection.IN,
      description: "Cobranza Agencia Interactive (50% de FC-51)",
      referenceType: "COMMERCIAL_RECEIPT",
      referenceId: cobranza2.id,
      recordedAt: new Date("2026-03-20"),
      recordedById: director.id,
    },
  });

  // Nota de Crédito: revés de cargo
  await prisma.commercialDocument.create({
    data: {
      companyId: tiempodesguro.id,
      clientId: anunciante3.id,
      createdById: director.id,
      documentType: CommercialDocumentType.DEBIT_NOTE,
      documentNumber: "ND-A-0002-00000053",
      issueDate: new Date("2026-03-22"),
      currency: CurrencyCode.ARS,
      exchangeRate: new Prisma.Decimal(1),
      status: CommercialDocumentStatus.ISSUED,
      isFiscalizable: true,
      subtotalAmount: new Prisma.Decimal(2000),
      taxAmount: new Prisma.Decimal(420),
      totalAmount: new Prisma.Decimal(2420),
      openAmount: new Prisma.Decimal(2420),
      notes: "Reintegro por servicios no prestados",
      lines: {
        create: [
          {
            companyId: tiempodesguro.id,
            itemId: paqueteBasico.id,
            lineNumber: 1,
            description: "Devolución - Paquete Básico (1 mes - no utilizado)",
            quantity: new Prisma.Decimal(-1),
            unit: "mes",
            unitPrice: new Prisma.Decimal(1500),
            discountAmount: new Prisma.Decimal(0),
            subtotalAmount: new Prisma.Decimal(-1500),
            taxAmount: new Prisma.Decimal(-315),
            totalAmount: new Prisma.Decimal(-1815),
          },
          {
            companyId: tiempodesguro.id,
            itemId: servicioAnalytics.id,
            lineNumber: 2,
            description: "Cargo por rectificación Analytics",
            quantity: new Prisma.Decimal(1),
            unit: "mes",
            unitPrice: new Prisma.Decimal(2200),
            discountAmount: new Prisma.Decimal(280),
            subtotalAmount: new Prisma.Decimal(1920),
            taxAmount: new Prisma.Decimal(403.2),
            totalAmount: new Prisma.Decimal(2323.2),
          },
        ],
      },
    },
  });

  // Egreso: pago de plataforma de servicios
  await prisma.bankMovement.create({
    data: {
      companyId: tiempodesguro.id,
      bankAccountId: bancoItau.id,
      movementType: BankMovementType.PAYMENT,
      amount: new Prisma.Decimal(45000),
      direction: TreasuryMovementDirection.OUT,
      description: "Pago a plataforma de hosting Google Cloud",
      referenceType: "VENDOR_PAYMENT",
      referenceId: "GCP-INVOICE-MAR",
      recordedAt: new Date("2026-03-25"),
      recordedById: contable.id,
    },
  });

  // Egreso: transferencia de impuestos
  await prisma.bankMovement.create({
    data: {
      companyId: tiempodesguro.id,
      bankAccountId: bancoItau.id,
      movementType: BankMovementType.PAYMENT,
      amount: new Prisma.Decimal(15000),
      direction: TreasuryMovementDirection.OUT,
      description: "Anticipo de impuestos (IIBB) Marzo",
      referenceType: "TAX_PAYMENT",
      referenceId: "IIBB-MAR-2026",
      recordedAt: new Date("2026-03-26"),
      recordedById: contable.id,
    },
  });

  console.log("✅ tiempodesguro.com.ar creada exitosamente");
  return tiempodesguro;
}

// ============================================================================
// MAIN
// ============================================================================

async function seedNewCompanies() {
  try {
    const tejededora = await seedTejededorDelSur();
    const tiempodesguro = await seedTiempodeSeguro();

    console.log("\n📊 RESUMEN CREADO:");
    console.log(`  ✅ Empresa 1: ${tejededora.name}`);
    console.log(`  ✅ Empresa 2: ${tiempodesguro.name}`);
    console.log("\n🎉 Seeds completados exitosamente!");
  } catch (error) {
    console.error("Error durante seeding:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seedNewCompanies();
