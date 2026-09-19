"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function EngineerLogoutButton({
  label = "Keluar",
  variant = "ghost",
  className,
}: {
  label?: string;
  variant?: "ghost" | "outline" | "secondary";
  className?: string;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size="sm"
      className={className}
      onClick={() => {
        void (async () => {
          await signOut({ redirect: false });
          window.location.assign("/login");
        })();
      }}
    >
      <LogOut className="mr-1.5 h-3.5 w-3.5" />
      {label}
    </Button>
  );
}
