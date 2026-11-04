import type { Metadata } from "next";

import { AccountProfile } from "@/components/app/account-profile";

export const metadata: Metadata = { title: "Profile" };

export default function AccountPage() {
  return <AccountProfile />;
}
