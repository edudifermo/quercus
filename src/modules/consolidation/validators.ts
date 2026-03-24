import { z } from "zod";

export const consolidatedFiltersSchema = z
  .object({
    consolidationGroupId: z.string().trim().min(1, "Grupo de consolidación requerido."),
    companyId: z.string().trim().optional(),
    dateFrom: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? new Date(`${value}T00:00:00.000Z`) : undefined)),
    dateTo: z
      .string()
      .trim()
      .optional()
      .transform((value) => (value ? new Date(`${value}T23:59:59.999Z`) : undefined)),
    currency: z.enum(["ARS", "USD", "EUR"]).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.dateFrom && Number.isNaN(value.dateFrom.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateFrom"], message: "Fecha desde inválida." });
    }

    if (value.dateTo && Number.isNaN(value.dateTo.getTime())) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["dateTo"], message: "Fecha hasta inválida." });
    }

    if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["dateTo"],
        message: "La fecha hasta no puede ser menor que la fecha desde.",
      });
    }
  });

export type ConsolidatedFiltersInput = z.infer<typeof consolidatedFiltersSchema>;
