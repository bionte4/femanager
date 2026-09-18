import { z } from "zod";

export const candidateRegisterSchema = z.object({
  full_name: z.string().min(3).max(120),
  phone: z.string().min(10).max(15),
  whatsapp: z.string().min(10).max(15),
  email: z.string().email().optional().nullable().or(z.literal("")),
  nik: z.string().min(16).max(16).optional().nullable().or(z.literal("")),
  address: z.string().min(5).max(500),
  province: z.string().min(2).max(100),
  city: z.string().min(2).max(100),
  district: z.string().min(2).max(100),
  lat: z.number().optional().nullable(),
  lng: z.number().optional().nullable(),
  education: z.string().min(2).max(50),
  school_name: z.string().max(150).optional().nullable().or(z.literal("")),
  has_motorcycle: z.boolean(),
  has_toolkit: z.boolean(),
  has_laptop: z.boolean(),
  has_car: z.boolean().optional().default(false),
  has_ladder: z.boolean().optional().default(false),
  has_drill: z.boolean().optional().default(false),
  skills: z.array(z.string()).min(1),
  experience_years: z.number().int().min(0).max(40),
  previous_vendor: z.string().max(100).optional().nullable().or(z.literal("")),
  bank_name: z.string().max(50).optional().nullable().or(z.literal("")),
  bank_account_no: z.string().max(30).optional().nullable().or(z.literal("")),
  bank_account_name: z.string().max(120).optional().nullable().or(z.literal("")),
  id_card_photo_url: z.string().min(1).optional().nullable().or(z.literal("")),
  selfie_photo_url: z.string().min(1).optional().nullable().or(z.literal("")),
  assigned_coordinator_id: z.string().optional().nullable().or(z.literal("")),
});

export type CandidateRegisterInput = z.infer<typeof candidateRegisterSchema>;
