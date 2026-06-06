import { z } from "zod";
import { tables } from "./core.js";

const tableEnum = z.enum(tables);
const idParam = z.union([z.string().min(1), z.number()]).optional();
const record = z.record(z.string(), z.unknown());

export const schemas = {
  login: z.object({
    email: z.string().trim().toLowerCase().email(),
    password: z.string().min(1)
  }),
  changePassword: z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8)
  }),
  resetPassword: z.object({
    userId: z.union([z.string().min(1), z.number()]),
    newPassword: z.string().min(8)
  }),
  upload: z.object({
    dataUrl: z.string().min(1),
    type: z.string().optional(),
    folder: z.string().optional(),
    name: z.string().optional()
  }),
  contactMessage: z.object({
    nama: z.string().trim().min(2).max(160),
    whatsapp: z.string().trim().min(6).max(40),
    email: z.string().trim().email().optional().or(z.literal("")),
    subjek: z.string().trim().max(160).optional().or(z.literal("")),
    pesan: z.string().trim().min(5).max(2000)
  }),
  tableParams: z.object({
    table: tableEnum,
    id: idParam
  }),
  tableBody: z.union([record, z.array(record).min(1)])
};

export function parse(schema, value) {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  const message = result.error.issues.map((issue) => issue.message).join("; ") || "Data tidak valid.";
  const error = new Error(message);
  error.statusCode = 400;
  throw error;
}
