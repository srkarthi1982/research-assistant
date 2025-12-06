import { defineDb } from "astro:db";
import {
  ResearchProjects,
  ResearchSources,
  ResearchNotes,
  AiJobs,
} from "./tables";

// https://astro.build/db/config
export default defineDb({
  tables: {
    ResearchProjects,
    ResearchSources,
    ResearchNotes,
    AiJobs,
  },
});
