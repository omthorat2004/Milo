import type { Metadata } from "next";

import { VerifyStatus } from "@/components/app/verify-status";

export const metadata: Metadata = { title: "Verify your email" };

export default async function VerifyPage(props: PageProps<"/verify">) {
  const { email } = await props.searchParams;

  return (
    <>
      <h1 className="font-display text-3xl text-foreground">Verify your email</h1>
      <p className="mt-2 text-sm text-foreground-muted">
        Enter the code we sent to finish setting up your account.
      </p>

      <VerifyStatus email={typeof email === "string" ? email : undefined} className="mt-8" />
    </>
  );
}
