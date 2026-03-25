import { defineDb } from "astro:db";
import { ResearchNotes, ResearchProjects } from "./tables";

export default defineDb({
  tables: {
    ResearchProjects,
    ResearchNotes,
  },
});
