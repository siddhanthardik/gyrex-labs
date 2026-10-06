import { redirect } from "next/navigation";

export default function StoreSettingsRedirectPage() {
  redirect("/lab/settings?section=storefront");
}
