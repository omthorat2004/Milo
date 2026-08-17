import type { Metadata } from "next";
import Link from "next/link";

import { AuthForm } from "@/components/app/auth-form";

export const metadata: Metadata = { title: "Create an account" };

export default function RegisterPage() {
  return (
    <>
      <h1 className="font-display text-3xl text-sand-50">Create your account</h1>
      <p className="mt-2 text-sm text-sand-500">One account, every resume you want to track.</p>

      <AuthForm mode="register" className="mt-8" />

      <p className="mt-6 text-sm text-sand-700">
        Already have one?{" "}
        <Link href="/login" className="text-signal-400 hover:text-signal-300">
          Log in
        </Link>
      </p>
    </>
  );
}
