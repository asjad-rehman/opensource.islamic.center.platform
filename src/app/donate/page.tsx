import { getCachedSettings } from "@/lib/cached-content";
import DonateClient from "./donate-client";

export const revalidate = 3600;

export default async function DonatePage() {
  const settings = await getCachedSettings();
  return (
    <DonateClient
      zeffyOneTimeId={settings.zeffyOneTimeId}
      zeffyMonthlyId={settings.zeffyMonthlyId}
      oakGroveUrl={settings.oakGroveUrl}
    />
  );
}
