import type { Metadata } from "next";
import { CookiePolicy } from "@/features/privacy/components/cookie-policy";

export const metadata: Metadata = {
  title: "Cookie policy · SpendSense",
  description: "Which cookies SpendSense uses, why, and how to change your choice.",
};

/** Static page: no request data, so it prerenders like the landing page. */
export default function CookiesPage() {
  return <CookiePolicy />;
}
