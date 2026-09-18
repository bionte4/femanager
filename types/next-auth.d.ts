import { Role } from "@prisma/client";
import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    id: string;
    phone: string;
    role: Role;
    partnership_status?: string;
    engagement_type?: string;
  }

  interface Session {
    user: {
      id: string;
      phone: string;
      role: Role;
      partnership_status?: string;
      engagement_type?: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    phone: string;
    role: Role;
    partnership_status?: string;
    engagement_type?: string;
  }
}
