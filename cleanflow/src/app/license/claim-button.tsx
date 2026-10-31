"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { claimLicense } from "./actions";

export function ClaimLicenseButton() {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  return (
    <Button
      loading={pending}
      onClick={async () => {
        setPending(true);
        const res = await claimLicense();
        setPending(false);
        if (!res.ok) return toast.error(res.error);
        if (res.data.status === "active") {
          toast.success("Access activated");
          router.replace("/dashboard");
        } else if (res.data.status === "refunded" || res.data.status === "revoked") {
          toast.error("This licence is no longer active. Contact the seller if you think this is a mistake.");
        } else {
          toast.error("No active licence found for this email yet.");
        }
      }}
    >
      Check my licence
    </Button>
  );
}
