# Presentation

`CareForAll.tex` is a self-contained **Beamer** slide deck covering the failure
story, the solution, and all four checkpoints with the working flow and continuity.

## Build to PDF

### Option A — Overleaf (no install)
1. Go to https://www.overleaf.com → **New Project → Upload Project** (or paste the file).
2. Set the compiler to **pdfLaTeX** (Menu → Compiler).
3. Click **Recompile**. Download the PDF.

### Option B — Local LaTeX (TeX Live / MiKTeX)
```bash
pdflatex CareForAll.tex
pdflatex CareForAll.tex   # run twice so the outline/links resolve
```
Produces `CareForAll.pdf`.

## Notes
- Uses only standard packages: `beamer`, `tikz`, `booktabs`, `listings`, `xcolor`, `amssymb`.
- Theme: Madrid + seahorse. Aspect ratio 16:9.
- Edit `\author{}` / `\institute{}` on the title slide to your team details.
