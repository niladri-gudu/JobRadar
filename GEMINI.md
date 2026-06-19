This document establishes the operational rules for Gemini and all workspace coding agents. You must strictly read, reference, and adhere to the guidelines outlined here, in `DESIGN.md`, and in `PROJECT_SPECIFICATION.md` before writing any codebase logic or components.

---

## 1. Primary Directives & Implementation Truths
- **Follow the PRD:** Treat `PROJECT_SPECIFICATION.md` as the definitive authority for all application features, system architecture, endpoints, database schemas, and backend configurations. 
- **Enforce Visual Tokens:** Adhere strictly to the "Zen Systems Engineering" language defined in `DESIGN.md`. Ensure all UI generation relies strictly on the layout behaviors, fonts, and hex mappings outlined there (e.g., `#050505` canvas, `#0B0B0C` surface background, flat borders, no box-shadows).

---

## 2. Workspace Skills Integration
You have access to specific local agent tools. You must leverage them natively when executing implementation steps:

- **Browser Automation (`remote-browser`):** Use the `browser-use` CLI toolkit for any scraping, dynamic career page crawling, or text extraction routines described in the specification.
- **Frontend Components (`shadcn`, `frontend-design`, `web-design-guidelines`):** Build interface structures utilizing accessible `shadcn` primitives formatted to match our exact high-contrast dark aesthetic rules.
- **Intelligent Processing (`llm-application-dev`):** Apply clean prompt engineering patterns and context strategies when implementing features that parse, categorize, or score raw text.
- **Backend Communications (`aws-sdk-js-v3-usage`):** Use modular AWS SDK v3 imports for data storage or messaging modules if and where dictated by the technical specifications.

---

## 3. Order of Operations
1. Reference `PROJECT_SPECIFICATION.md` for feature boundaries and backend mechanics.
2. Reference `DESIGN.md` for visual tokens, high-density layouts, and component structures.
3. Utilize your environment skills directly rather than creating unoptimized custom tools.