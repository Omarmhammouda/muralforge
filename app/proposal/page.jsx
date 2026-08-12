"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Legacy route — the proposal system now lives at /proposals. */
export default function LegacyProposalRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/proposals");
  }, [router]);
  return null;
}
