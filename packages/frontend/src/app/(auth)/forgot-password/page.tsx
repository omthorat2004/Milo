import type { Metadata } from "next";
import Link from "next/link";

import { ForgotPasswordForm } from "@/components/app/forgot-password-form";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="font-display text-3xl text-foreground">Reset your password</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        {"Enter your email and we'll send you a code to reset it."}
      </p>

      <ForgotPasswordForm className="mt-8" />

      <p className="mt-6 text-sm text-foreground-muted">
        Remembered it?{" "}
        <Link href="/login" className="text-signal-400 hover:text-signal-300">
          Log in
        </Link>
      </p>
    </>
  );
}
