# AiMecha M1 Documentation

VitePress documentation for the AiMecha M1 robot. Edit the source files in
`content/<version>/`. The scripts regenerate `docs/docs/`, `docs/_static/`,
and `docs/index.md`; edits to these working copies are overwritten.

## Advanced Kit

The Advanced Kit contains Kit Introduction, Quick Start, Teaching Cases with
32 lessons, Deep Learning, and an Appendix. The sidebar lists the lessons in
numerical order beneath Teaching Cases, and the course table links to their
English filenames. The root and `docs/index.html` open Kit Introduction.

Install dependencies with `npm ci`, then run:

```bash
npm run dev:advanced-kit
```

Open the local URL printed by VitePress. Production build:

```bash
npm run build:advanced-kit
```

Generated files are staged to `projects/AiMechaM1/en/advanced-kit/`.
The overview version is available with `npm run dev:latest` and
`npm run build:latest`. Build both versions sequentially using
`npm run build:all`. Standard and Ultimate Kit commands are reserved for
future content.

To preview both staged versions together, run this from the repository root:

```bash
python -m http.server 4173
```

Open http://localhost:4173/projects/AiMechaM1/en/advanced-kit/ or the root
version selection page at http://localhost:4173/.

Dev and build commands share a working directory. Stop a dev server before
building or developing a different version.

## Media and assembly guide

Images, animations, and videos are included in the version's `_static/`
directory. Lesson videos have playback controls. Production builds bundle
referenced media and stage any files under `_static/pdf/` or
`_static/shared/pdf/` so PDF previews can use their original paths.

GIF animations have been compressed to animated WebP (maximum width 960 px,
quality 80), retaining their playback duration and loop setting. To compress
new GIF files and update their page references, run:

```bash
node scripts/compress_gifs.mjs advanced-kit
npm run build:advanced-kit
```

The compression script backs up the original GIFs and modified source pages
in the system temporary directory and prints the backup/report location.

The M1 assembly PDF is stored at
`content/advanced-kit/_static/shared/pdf/AiMecha M1 English accessory assembly step diagram.pdf`.
Quick Start and Lesson 1 embed the same guide using the globally registered
`<Pdf>` component (`<pdf>` is also supported). Use `../_static/shared/pdf/`
from chapter pages and `../../_static/shared/pdf/` from nested lesson pages.

## Deployment

Publish the staged `projects/AiMechaM1/en/<version>/` directories alongside
`index.html` and `.nojekyll` at the website root. The Advanced Kit entry is:

```text
/projects/AiMechaM1/en/advanced-kit/docs/1.%20Kit%20Introduction.html
```

For GitHub Pages branch deployment, use the repository root as the publishing
source. Hosting under a repository URL prefix requires adjusting `DOCS_BASE`
and the root landing page URLs to match that prefix.
