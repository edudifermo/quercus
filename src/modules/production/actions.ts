"use server";

import { revalidatePath } from "next/cache";
import { Prisma, ProductionOrderStatus, StockMovementType } from "@prisma/client";
import { prisma } from "@/infrastructure/database/prisma";
import { buildRequirements } from "@/modules/production/data";
import { requirePermission } from "@/modules/production/auth";
import { toNumber } from "@/modules/production/utils";
import type { AppContext } from "@/modules/production/auth";

function decimal(value: number) {
  return new Prisma.Decimal(value.toFixed(3));
}

function decimalCost(value: number) {
  return new Prisma.Decimal(value.toFixed(2));
}

export async function createProductionOrder(
  context: AppContext,
  formData: FormData,
) {
  requirePermission(context, "production.write");

  const bomId = String(formData.get("bomId") ?? "");
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const plannedQuantity = Number(formData.get("plannedQuantity") ?? 0);
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const { bom, requirements, expectedOutputQty } = await buildRequirements({
    bomId,
    plannedQuantity,
    companyId: context.company.id,
    warehouseId,
  });

  const lastOrder = await prisma.productionOrder.findFirst({
    where: { companyId: context.company.id },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  const sequence = (Number(lastOrder?.code.split("-").at(-1)) || 0) + 1;
  const code = `OF-${String(sequence).padStart(4, "0")}`;

  await prisma.productionOrder.create({
    data: {
      companyId: context.company.id,
      code,
      bomId: bom.id,
      finishedItemId: bom.finishedItemId,
      warehouseId,
      status: requirements.some((requirement) => requirement.shortageQuantity > 0)
        ? ProductionOrderStatus.DRAFT
        : ProductionOrderStatus.RELEASED,
      plannedQuantity: decimal(plannedQuantity),
      expectedOutputQty: decimal(expectedOutputQty),
      notes,
      createdById: context.user.id,
      requirements: {
        create: requirements.map((requirement) => ({
          componentItemId: requirement.componentItemId,
          theoreticalQuantity: decimal(requirement.theoreticalQuantity),
          availableQuantity: decimal(requirement.availableQuantity),
          shortageQuantity: decimal(requirement.shortageQuantity),
        })),
      },
    },
  });

  revalidatePath("/");
  revalidatePath("/reportes/produccion");
}

export async function registerConsumption(context: AppContext, formData: FormData) {
  requirePermission(context, "production.write");

  const orderId = String(formData.get("orderId") ?? "");
  const componentItemId = String(formData.get("componentItemId") ?? "");
  const warehouseId = String(formData.get("warehouseId") ?? "");
  const consumedQuantity = Number(formData.get("consumedQuantity") ?? 0);
  const scrapQuantity = Number(formData.get("scrapQuantity") ?? 0);
  const lotReference = String(formData.get("lotReference") ?? "").trim() || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const order = await prisma.productionOrder.findFirst({
    where: { id: orderId, companyId: context.company.id },
    include: { requirements: true },
  });

  if (!order) {
    throw new Error("La OF no existe en el tenant activo.");
  }

  const requirement = order.requirements.find(
    (entry) => entry.componentItemId === componentItemId,
  );

  await prisma.productionConsumption.create({
    data: {
      productionOrderId: order.id,
      requirementId: requirement?.id,
      componentItemId,
      warehouseId,
      theoreticalQuantity: requirement?.theoreticalQuantity ?? decimal(0),
      consumedQuantity: decimal(consumedQuantity),
      scrapQuantity: decimal(scrapQuantity),
      lotReference,
      notes,
      createdById: context.user.id,
    },
  });

  await prisma.productionOrder.update({
    where: { id: order.id },
    data: {
      status:
        order.status === ProductionOrderStatus.RELEASED ||
        order.status === ProductionOrderStatus.DRAFT
          ? ProductionOrderStatus.IN_PROGRESS
          : order.status,
    },
  });

  revalidatePath(`/produccion/of/${orderId}`);
  revalidatePath("/");
  revalidatePath("/reportes/produccion");
}

export async function closeProductionOrder(context: AppContext, formData: FormData) {
  requirePermission(context, "production.close");

  const orderId = String(formData.get("orderId") ?? "");
  const producedQuantity = Number(formData.get("producedQuantity") ?? 0);
  const scrapQuantity = Number(formData.get("scrapQuantity") ?? 0);

  const order = await prisma.productionOrder.findFirst({
    where: { id: orderId, companyId: context.company.id },
    include: {
      finishedItem: true,
      consumptions: {
        include: {
          componentItem: true,
        },
      },
    },
  });

  if (!order) {
    throw new Error("La OF no existe en el tenant activo.");
  }

  if (order.status === ProductionOrderStatus.CLOSED) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    for (const consumption of order.consumptions) {
      const totalConsumed = toNumber(consumption.consumedQuantity) + toNumber(consumption.scrapQuantity);
      await tx.stockMovement.create({
        data: {
          companyId: order.companyId,
          warehouseId: consumption.warehouseId,
          itemId: consumption.componentItemId,
          movementType: StockMovementType.PRODUCTION_CONSUMPTION,
          quantity: decimal(-totalConsumed),
          unitCost: decimalCost(toNumber(consumption.componentItem.standardCost)),
          referenceType: "PRODUCTION_ORDER",
          referenceId: order.id,
          traceCode: `${order.code}:${consumption.componentItem.sku}:CONSUMO`,
        },
      });
    }

    await tx.stockMovement.create({
      data: {
        companyId: order.companyId,
        warehouseId: order.warehouseId,
        itemId: order.finishedItemId,
        movementType: StockMovementType.PRODUCTION_OUTPUT,
        quantity: decimal(producedQuantity),
        unitCost: decimalCost(toNumber(order.finishedItem.standardCost)),
        referenceType: "PRODUCTION_ORDER",
        referenceId: order.id,
        traceCode: `${order.code}:${order.finishedItem.sku}:INGRESO`,
      },
    });

    await tx.productionOrder.update({
      where: { id: order.id },
      data: {
        status: ProductionOrderStatus.CLOSED,
        producedQuantity: decimal(producedQuantity),
        scrapQuantity: decimal(scrapQuantity),
        closedAt: new Date(),
        closedById: context.user.id,
      },
    });
  });

  revalidatePath(`/produccion/of/${orderId}`);
  revalidatePath("/");
  revalidatePath("/reportes/produccion");
}
