import { z } from "zod";

export const passwordSchema = z.string().min(8, "Password minimal 8 karakter.");
export const emailSchema = z.string().email("Email tidak valid.").toLowerCase();
export const uuidLikeSchema = z.string().min(1, "ID wajib diisi.");

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Password lama wajib diisi."),
  newPassword: passwordSchema,
  confirmPassword: passwordSchema
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Konfirmasi password tidak sama.",
  path: ["confirmPassword"]
});
