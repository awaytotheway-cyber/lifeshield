import { Redirect } from "expo-router";

import { routes } from "@/lib/routes";

/** More tab opens here, then lands on the profile screen. */
export default function SettingsIndex() {
  return <Redirect href={routes.profile} />;
}
