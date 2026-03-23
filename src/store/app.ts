import type { Alpine } from "alpinejs";
import { AvBaseStore } from "@ansiversa/components/alpine";
import {
  RESEARCH_STORAGE_KEY,
  buildResearchSectionText,
  buildResearchSummaryText,
  createDefaultResearchDraft,
  getResearchSectionContent,
  getResearchSectionTitle,
  type ResearchDraft,
  type ResearchSectionKey,
} from "../lib/research";

type ToggleField = "showReferences" | "showConclusions";

const cloneDefaultDraft = () => createDefaultResearchDraft();

const copyText = async (value: string) => {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "true");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
};

export class ResearchAppStore extends AvBaseStore {
  draft: ResearchDraft = cloneDefaultDraft();
  initialized = false;
  copyMessage = "";
  copyError = "";
  showResetConfirmation = false;

  init() {
    if (this.initialized || typeof window === "undefined") return;

    this.initialized = true;

    try {
      const saved = window.localStorage.getItem(RESEARCH_STORAGE_KEY);
      if (!saved) return;

      const parsed = JSON.parse(saved) as Partial<ResearchDraft>;
      this.draft = {
        ...cloneDefaultDraft(),
        ...parsed,
      };
    } catch (error) {
      console.error(error);
    }
  }

  updateField(field: keyof ResearchDraft, value: string) {
    this.draft = {
      ...this.draft,
      [field]: value,
    };
    this.clearTransientState();
    this.persist();
  }

  updateToggle(field: ToggleField, checked: boolean) {
    this.draft = {
      ...this.draft,
      [field]: checked,
    };
    this.clearTransientState();
    this.persist();
  }

  getPreviewValue(key: ResearchSectionKey) {
    return getResearchSectionContent(this.draft, key);
  }

  getSectionTitle(key: ResearchSectionKey) {
    return getResearchSectionTitle(key);
  }

  async copyFullResearch() {
    await this.copy(buildResearchSummaryText(this.draft), "Research summary copied");
  }

  async copySection(key: ResearchSectionKey) {
    await this.copy(buildResearchSectionText(this.draft, key), `${getResearchSectionTitle(key)} copied`);
  }

  requestReset() {
    this.showResetConfirmation = true;
    this.copyMessage = "";
    this.copyError = "";
  }

  cancelReset() {
    this.showResetConfirmation = false;
  }

  confirmReset() {
    this.draft = cloneDefaultDraft();
    this.showResetConfirmation = false;
    this.copyMessage = "Research draft cleared";
    this.copyError = "";

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(RESEARCH_STORAGE_KEY);
    }
  }

  private persist() {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(RESEARCH_STORAGE_KEY, JSON.stringify(this.draft));
  }

  private clearTransientState() {
    this.copyMessage = "";
    this.copyError = "";
    this.showResetConfirmation = false;
  }

  private async copy(text: string, successMessage: string) {
    try {
      await copyText(text);
      this.copyMessage = successMessage;
      this.copyError = "";
    } catch (error) {
      console.error(error);
      this.copyMessage = "";
      this.copyError = "Copy failed. Please try again.";
    }
  }
}

export const registerResearchAppStore = (Alpine: Alpine) => {
  Alpine.store("researchApp", new ResearchAppStore());
};
