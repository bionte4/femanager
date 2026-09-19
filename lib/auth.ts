import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";

const loginSchema = z.object({
  phone: z.string().min(10).max(15),
  password: z.string().min(6),
});

export {
  ADMIN_ROLES,
  CONTRACT_ADMIN_ROLES,
  NOC_L0_ROLES,
  NOC_L1_ROLES,
} from "@/lib/auth.config";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Phone",
      credentials: {
        phone: { label: "Phone", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { phone, password } = parsed.data;
        const user = await prisma.user.findUnique({ where: { phone } });

        if (!user) {
          return null;
        }

        if (user.is_suspended) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) {
          return null;
        }

        return {
          id: user.id,
          name: user.full_name,
          phone: user.phone,
          role: user.role,
          partnership_status: user.partnership_status,
          engagement_type: user.engagement_type,
        };
      },
    }),
  ],
});
