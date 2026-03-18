import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { calcRequirement, calcShortage, toNumber } from "@/modules/production/utils";

export async function getOnHandMap(companyId: string, warehouseId?: string) {
  const where: Prisma.StockMovementWhereInput = {
    companyId,
    ...(warehouseId ? { warehouseId } : {}),
  };

  const movements = await prisma.stockMovement.groupBy({
    by: ["itemId"],
    where,
    _sum: {
      quantity: true,
    },
  });

  return new Map(movements.map((movement) => [movement.itemId, toNumber(movement._sum.quantity)]));
}

export async function getProductionDashboard(companyId: string) {
  const [orders, warehouses, items, boms] = await Promise.all([
    prisma.productionOrder.findMany({
      where: { companyId },
      include: {
        finishedItem: true,
        warehouse: true,
        requirements: { include: { componentItem: true } },
        consumptions: { include: { componentItem: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.warehouse.findMany({ where: { companyId }, orderBy: { name: "asc" } }),
    prisma.item.findMany({ where: { companyId }, orderBy: [{ itemType: "asc" }, { name: "asc" }] }),
    prisma.bom.findMany({
      where: { companyId, isActive: true },
      include: {
        finishedItem: true,
        lines: { include: { componentItem: true } },
      },
      orderBy: [{ finishedItem: { name: "asc" } }, { version: "desc" }],
    }),
  ]);

  const statusSummary = orders.reduce<Record<string, number>>((acc, order) => {
    acc[order.status] = (acc[order.status] ?? 0) + 1;
    return acc;
  }, {});

  const shortages = orders.flatMap((order) =>
    order.requirements
      .filter((requirement) => toNumber(requirement.shortageQuantity) > 0)
      .map((requirement) => ({
        orderCode: order.code,
        itemName: requirement.componentItem.name,
        shortageQuantity: toNumber(requirement.shortageQuantity),
        uom: requirement.componentItem.uom,
      })),
  );

  const consumptionVariance = orders.map((order) => {
    const theoretical = order.requirements.reduce(
      (sum, requirement) => sum + toNumber(requirement.theoreticalQuantity),
      0,
    );
    const actual = order.consumptions.reduce(
      (sum, consumption) =>
        sum + toNumber(consumption.consumedQuantity) + toNumber(consumption.scrapQuantity),
      0,
    );

    return {
      orderId: order.id,
      code: order.code,
      finishedItem: order.finishedItem.name,
      theoretical,
      actual,
      variance: actual - theoretical,
    };
  });

  const outputSummary = orders.reduce(
    (acc, order) => {
      acc.planned += toNumber(order.plannedQuantity);
      acc.produced += toNumber(order.producedQuantity);
      acc.scrap += toNumber(order.scrapQuantity);
      return acc;
    },
    { planned: 0, produced: 0, scrap: 0 },
  );

  const stockByItem = await getOnHandMap(companyId);

  const inventory = items.map((item) => ({
    ...item,
    onHand: stockByItem.get(item.id) ?? 0,
  }));

  return {
    orders,
    warehouses,
    items,
    boms,
    statusSummary,
    shortages,
    consumptionVariance,
    outputSummary,
    inventory,
  };
}

export async function getOrderDetail(orderId: string, companyId: string) {
  const order = await prisma.productionOrder.findFirst({
    where: { id: orderId, companyId },
    include: {
      bom: {
        include: {
          lines: {
            include: { componentItem: true },
          },
          finishedItem: true,
        },
      },
      finishedItem: true,
      warehouse: true,
      requirements: { include: { componentItem: true } },
      consumptions: {
        include: {
          componentItem: true,
          createdBy: true,
        },
        orderBy: { createdAt: "asc" },
      },
      createdBy: true,
      closedBy: true,
    },
  });

  if (!order) {
    throw new Error("OF no encontrada para el tenant activo.");
  }

  const onHandMap = await getOnHandMap(companyId, order.warehouseId);

  return {
    order,
    warehouseStock: Object.fromEntries(onHandMap.entries()),
  };
}

export async function buildRequirements(input: {
  bomId: string;
  plannedQuantity: number;
  companyId: string;
  warehouseId: string;
}) {
  const bom = await prisma.bom.findFirst({
    where: { id: input.bomId, companyId: input.companyId, isActive: true },
    include: {
      lines: { include: { componentItem: true } },
      finishedItem: true,
    },
  });

  if (!bom) {
    throw new Error("La composición seleccionada no pertenece al tenant activo.");
  }

  const onHandMap = await getOnHandMap(input.companyId, input.warehouseId);

  const requirements = bom.lines.map((line) => {
    const theoreticalQuantity = calcRequirement(
      toNumber(line.quantity),
      input.plannedQuantity,
      toNumber(bom.baseQuantity),
      toNumber(line.scrapRate),
    );
    const availableQuantity = onHandMap.get(line.componentItemId) ?? 0;
    const shortageQuantity = calcShortage(theoreticalQuantity, availableQuantity);

    return {
      componentItemId: line.componentItemId,
      theoreticalQuantity,
      availableQuantity,
      shortageQuantity,
      componentItem: line.componentItem,
    };
  });

  return {
    bom,
    requirements,
    expectedOutputQty: input.plannedQuantity,
  };
}
