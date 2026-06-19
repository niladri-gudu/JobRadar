# DESIGN.md — JobBot Command Center

This document defines the complete visual language, design tokens, and structural specifications for the JobBot application. AI agents must strictly adhere to these rules when generating components, views, or layouts.

## 1. Visual Theme & Atmosphere
The atmosphere is "Zen Systems Engineering"—an opinionated, high-contrast dark interface that prioritizes dense information over whitespace. The design draws inspiration from command-line interfaces and elite developer infrastructure tools. 
- **Style Rules:** Zero heavy shadows (use thin borders for elevation), pure pitch-black canvases, sharp borders (`border-radius: 6px` maximum), and highly intentional, desaturated status highlights.
- **Tone:** Technical, robust, fast, and high-fidelity.

## 2. Color Palette & Semantic Tokens
Do not use arbitrary colors or default brand gradients. Only use the semantic values specified in this matrix.

| Role | Token | Value | Rationale / Usage |
| :--- | :--- | :--- | :--- |
| Canvas Background | `--bg-canvas` | `#050505` | Absolute baseline app container |
| Surface Primary | `--bg-surface` | `#0B0B0C` | Dashboard blocks, cards, sidebar panels |
| Surface Hover | `--bg-hover` | `#141416` | Interactive row or button hover states |
| Boundary Border | `--border-subtle` | `#1F1F22` | Ultra-thin borders separating sections |
| Ink Primary | `--text-primary` | `#F3F4F6` | Highest emphasis titles and values |
| Ink Secondary | `--text-secondary`| `#9CA3AF` | Labels, metadata, descriptions, timestamps |
| Accent Match (High) | `--accent-match` | `#10B981` | Emerald green for 85%+ score semantic indicators |
| Accent Match (Mid) | `--accent-warn` | `#F59E0B` | Amber for 60-84% score semantic indicators |
| System Pulse | `--accent-system`| `#6366F1` | Indigo/Indigo-violet for cron cues, webhooks, and logs |

## 3. Typography & Rhythm
- **Primary Typeface:** Inter, system-ui, sans-serif
- **Data/Log Typeface:** JetBrains Mono, SF Mono, monospace

| Level | Size | Weight | Line Height | Tracking | Application |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `h1` | `18px` | `600` | `1.2` | `-0.02em` | Main dashboard view title |
| `h2` | `14px` | `500` | `1.3` | `-0.01em` | Section headers / Card titles |
| `body` | `13px` | `400` | `1.5` | `0` | Job text fragments, descriptions |
| `mono` | `12px` | `400` | `1.4` | `0` | Crawler system running logs, tech tags |

## 4. Structural Layout Principles
- **Base Grid Unit:** `4px`
- **Component Padding:** `12px` or `16px` inner alignment.
- **Card Radius:** Max `6px` (`rounded-md` in Tailwind).
- **Structure Pattern:** A fixed split layout. A left side panel (`260px` fixed width) housing automated crawlers status, configurations, and system health controls. A main content field rendering a dense, scrollable job card bento block array or chronological feed.

## 5. Core Component Design Schemas

### 5.1 The Job Card (High-Density Feed Element)
- **Container:** Background `var(--bg-surface)`, border `1px solid var(--border-subtle)`.
- **Header Structure:** Title `var(--text-primary)` in inline configuration alongside a desaturated Company label. In the top-right corner, a pill badge displaying the match metric (e.g., `94% Match`) using `var(--accent-match)` text with a `10%` background opacity variant.
- **Tag Sub-layer:** Tech stack tags rendered in inline blocks with font `var(--mono)`, background `var(--bg-canvas)`, and border `1px solid var(--border-subtle)`.
- **AI Summary Block:** A dedicated callout box nested within the card using a solid left border (`2px solid var(--accent-system)`) containing the short explanation of *why* this job was surfaced.

### 5.2 System Monitor & Terminal Logs View
- **Container:** Code block look, background `var(--bg-canvas)`, border `1px solid var(--border-subtle)`.
- **Text Stream:** Fixed `var(--mono)`. Every timestamp code line must be flagged using `var(--text-secondary)`, while runtime actions append trailing `var(--accent-system)` pointers (e.g., `[03:00:02] CRAWLER -> Scraping Greenhouse API... [OK]`).

## 6. Layout Behavioral Rules (Do's and Don'ts)

### ✅ DO
- Use horizontal dividers (`1px solid var(--border-subtle)`) instead of background color variations to keep layouts distinct.
- Keep interactive button controls un-styled by background gradients; use a pure `1px solid var(--border-subtle)` outline with background transition to `var(--bg-hover)`.
- Keep text alignment perfectly uniform across dynamic rows.

### ❌ DON'T
- Do not use bright colored cards or drop-shadow effects (`box-shadow` is banned; clean flat borders only).
- Do not add standard marketing banners, huge hero margins, or large graphic placeholders. The UI must feel completely operational.
- Do not mix neon variations of primary color spectrums outside the strict token framework.