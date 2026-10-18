import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/app/auth-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <>
      <h1 className="font-display text-3xl text-foreground">Welcome back</h1>
      <p className="mt-2 text-sm text-foreground-muted">Pick up where your resumes left off.</p>

      <AuthForm mode="login" className="mt-8" />

      <p className="mt-6 text-sm text-foreground-muted">
        No account yet?{" "}
        <Link href="/register" className="text-signal-400 hover:text-signal-300">
          Create one
        </Link>
      </p>
    </>
  );
}
