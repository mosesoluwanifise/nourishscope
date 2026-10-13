# NourishScope

NourishScope is a free, browser-based decision-support tool. It helps community nutrition programs in Kentucky decide where to direct limited resources. It covers three areas: Nutrition, Community Health, and Food System and Agricultural Sustainability.

Everything runs in the visitor's browser. There are no accounts and no server, and data users upload never leaves their device.

- **Live site:** https://nourishscope.app/
- **Founder:** Yetunde Khadijat Olaogun
- **Methodology:** v1.0. See `reference/NourishScope_Calculation_Specification.docx` and the Methodology page.

## Project layout

| Path | What it holds |
|---|---|
| `data/NourishScope_Kentucky_County_Dataset_v1.0.xlsx` | The master Kentucky county dataset, the only copy edited by hand. Its `Data_Dictionary` sheet supplies source and year labels. |
| `scripts/build-data.ts` | Runs before every build. Validates the workbook and writes `src/generated/` plus the downloadable county CSV. |
| `src/lib/calc/` | The calculation engine (Methodology v1.0). |
| `src/lib/data/` | Data loading, upload parsing and county matching. |
| `src/pages/` | Site pages. Prose pages are Markdown. |
| `reference/` | The founder's calculation spec and Python reference program. |
| `docs/` | Requirements, plans and source documents. |

## Develop

Requires Node.js 22.12 or later.

```bash
npm install
npm run dev
```

## Test

Unit tests, including golden tests that reproduce the calculation spec's worked example:

```bash
npm test
```

Everything CI runs: the type check, unit tests, build, bundle-size check, and the Playwright accessibility and flow tests. The first run needs `npx playwright install chromium`.

```bash
npm run check
```

## Deploy

Pushing to `main` runs `.github/workflows/deploy.yml`. It tests, builds and deploys to GitHub Pages. In the repository settings, set **Pages → Source** to **GitHub Actions**.

The site is served at the root of its own domain, `nourishscope.app` (set under **Pages → Custom domain**). The domain's DNS must point at GitHub Pages: four `A` records for the bare domain (`185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153`) and a `CNAME` record for `www` pointing to `mosesoluwanifise.github.io`. To serve the site from a sub-path again, change `base` in `astro.config.mjs`.

## Refresh the data (yearly)

1. Update `data/NourishScope_Kentucky_County_Dataset_v1.0.xlsx`.
   - If a column's year changes (for example `arc_status_fy2027` becomes `arc_status_fy2028`), rename the header, then update that row's `field` and `data_year` in the `Data_Dictionary` sheet. Leave `key` unchanged.
2. Run `npm run build-data`. It stops with a clear message if anything is missing or blank where it shouldn't be.
3. Record the refresh date and source releases on the Changelog page.

`scripts/fill_nourishscope_dataset.py` fetches the Census and CDC figures. It still writes a CSV and needs updating to write the workbook directly; this is a planned follow-up. Keep CDC PLACES on the 2024 release until CDC restores the Kentucky measures.

## Licences

- Code: MIT (`LICENSE`)
- Content, methodology and compiled data: CC BY 4.0 (`LICENSE-CONTENT`)
