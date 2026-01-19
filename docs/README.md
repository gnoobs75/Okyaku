# Okyaku CRM Documentation

This folder contains comprehensive documentation for the Okyaku CRM Platform.

## Documents

### 1. Feature Presentation

**Files:**
- `OKYAKU_PRESENTATION.md` - Markdown presentation (for Marp, Slidev, or manual conversion)
- `OKYAKU_PRESENTATION.html` - Interactive HTML slideshow (ready to use)

**HTML Presentation Usage:**
1. Open `OKYAKU_PRESENTATION.html` in any web browser
2. Use arrow keys (← →) or spacebar to navigate
3. Click Previous/Next buttons at bottom right
4. Print to PDF via browser print function (Ctrl+P)

**Converting to PowerPoint:**
- **Option 1**: Use the HTML version, print to PDF, then import PDF into PowerPoint
- **Option 2**: Use [Marp](https://marp.app/) with the Markdown version:
  ```bash
  npm install -g @marp-team/marp-cli
  marp OKYAKU_PRESENTATION.md --pptx -o OKYAKU_PRESENTATION.pptx
  ```
- **Option 3**: Use [Pandoc](https://pandoc.org/):
  ```bash
  pandoc OKYAKU_PRESENTATION.md -o OKYAKU_PRESENTATION.pptx
  ```

### 2. User Manual

**File:** `OKYAKU_USER_MANUAL.md`

**Converting to PDF:**
- **Option 1**: Use [Pandoc](https://pandoc.org/):
  ```bash
  pandoc OKYAKU_USER_MANUAL.md -o OKYAKU_USER_MANUAL.pdf --toc --toc-depth=3
  ```
- **Option 2**: Use [markdown-pdf](https://www.npmjs.com/package/markdown-pdf):
  ```bash
  npm install -g markdown-pdf
  markdown-pdf OKYAKU_USER_MANUAL.md
  ```
- **Option 3**: Use VS Code with "Markdown PDF" extension
- **Option 4**: Use online converters like [Dillinger](https://dillinger.io/) or [CloudConvert](https://cloudconvert.com/)

## Document Contents

### Presentation (14 slides)
1. Title Slide
2. What is Okyaku?
3. Technology Stack
4. Platform Overview
5. Contact Management
6. Deal Pipeline Management
7. Social Media Suite
8. AI-Powered Intelligence
9. AI Lead Scoring
10. AI Agent with Human-in-the-Loop
11. Calendar & Scheduling
12. Audit & Compliance
13. Getting Started
14. Thank You

### User Manual (17 sections)
1. Introduction
2. Getting Started
3. Dashboard Overview
4. Contact Management
5. Company Management
6. Deal Pipeline
7. Activity Tracking
8. Task Management
9. Email Marketing
10. Social Media Management
11. AI Features
12. Calendar & Scheduling
13. Reports & Analytics
14. System Administration
15. User Roles & Personas
16. Troubleshooting
17. Glossary

## Quick PDF Generation (Windows)

If you have Chrome installed, you can quickly generate PDFs:

```powershell
# For User Manual
# Open in Chrome, then Ctrl+P → Save as PDF

# Or use wkhtmltopdf if installed:
wkhtmltopdf --enable-local-file-access OKYAKU_PRESENTATION.html OKYAKU_PRESENTATION.pdf
```

## Customization

Both documents use the Okyaku color scheme:
- **Primary (Ronin Red)**: #C52638
- **Secondary (Dark Navy)**: #3F465B
- **Accent (Dark Charcoal)**: #39364E

Edit the source files to customize content, branding, or styling.

## Related Documentation

- `../INSTALL.md` - Installation guide
- `../QUICKSTART.md` - Quick start guide
- `../AI_PROCESS_FLOW.md` - AI feature documentation
- `../AI_IMPLEMENTATION_PLAN.md` - Technical implementation details
- `../CLAUDE.md` - Developer reference
