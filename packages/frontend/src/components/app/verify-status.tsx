"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";

import { OtpForm } from "@/components/app/otp-form";
import { useResolveVerificationMutation } from "@/hooks/use-auth-mutations";
import { getAuthErrorMessage } from "@/lib/auth.api";
import { cn } from "@/lib/utils";

type Props = {
  email?: string;
  className?: string;
};

/**
 * Resolves live — re-runs on every mount, including a hard refresh — so the OTP step's cooldown
 * always reflects what the backend actually has right now, never a client-only timer that a
 * refresh would reset to the original value.
 */
export function VerifyStatus({ email, className }: Props) {
  const router = useRouter();
  const resolve = useResolveVerificationMutation();
  const requested = useRef(false);

  useEffect(() => {
    if (!email || requested.current) return;
    requested.current = true;
    resolve.mutate({ email });
    // resolve is a stable mutation handle; email (via the ref guard above) is the real dependency
    // — re-running this on every resolve identity change would re-trigger the request.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  useEffect(() => {
    if (resolve.data?.status === "verified") router.replace("/login");
  }, [resolve.data, router]);

  if (!email) {
    return (
      <p className={cn("text-sm text-foreground-muted", className)}>
        We don&apos;t know which email to verify.{" "}
        <Link href="/register" className="text-signal-400 hover:text-signal-300">
          Start over
        </Link>
        .
      </p>
    );
  }

  if (resolve.isError) {
    return (
      <p
        className={cn(
          "rounded-lg border border-clay-400/25 bg-clay-400/5 px-4 py-3 text-sm text-foreground-muted",
          className,
        )}
      >
        {getAuthErrorMessage(resolve.error, "Could not check verification status.")}
      </p>
    );
  }

  if (resolve.data?.status === "pending") {
    return (
      <OtpForm
        email={resolve.data.email}
        resendAfterSeconds={resolve.data.resendAfterSeconds}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn("flex min-h-40 items-center justify-center", className)}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-foreground-muted" aria-hidden="true" />
      <span className="sr-only">Checking verification status…</span>
    </div>
  );
}
