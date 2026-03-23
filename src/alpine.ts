import type { Alpine } from "alpinejs";
import { registerAppDrawerStore } from "./modules/app/drawerStore";
import { registerResearchAppStore } from "./store/app";

export default function initAlpine(Alpine: Alpine) {
  registerAppDrawerStore(Alpine);
  registerResearchAppStore(Alpine);

  if (typeof window !== "undefined") {
    window.Alpine = Alpine;
  }
}
