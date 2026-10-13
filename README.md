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

The site is hosted on **Cloudflare Pages**, in the owner's Cloudflare account, built from this repository in the owner's GitHub account. GitHub Actions (`.github/workflows/ci.yml`) runs every test on each pull request and on `main`; Cloudflare builds and publishes `main` on its own.

### One-time setup

1. **Repository.** The repository must be in the owner's GitHub account (transfer it under **Settings → General → Transfer ownership**, or fork it).
2. **Create the Pages project.** In the Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git**. Authorise GitHub, pick this repository, then set:
   - Production branch: `main`
   - Framework preset: `Astro`
   - Build command: `npm run build`
   - Build output directory: `dist`

   Node comes from `.node-version`; no environment variables are needed. Save and deploy. The site appears at `<project>.pages.dev`.
3. **Custom domain.** In the Pages project: **Custom domains → Set up a custom domain → `nourishscope.app`**, then the same for `www.nourishscope.app`.
   - If the domain's DNS is already on Cloudflare (bought through Cloudflare, or its nameservers point to Cloudflare), Cloudflare adds the records itself.
   - If not, either move the domain's nameservers to Cloudflare (**Add a domain** in the dashboard, then change the nameservers at the registrar), or add the `CNAME` records Cloudflare shows at the registrar.

   HTTPS is set up automatically. Every `.app` domain needs it.
4. **Leave Web Analytics off.** The Privacy page promises no analytics or tracking, so do not enable Cloudflare Web Analytics for this project.
5. **Turn off the old GitHub Pages site**, if one exists: **Settings → Pages**, remove the custom domain, and set **Source** to **None**.

### After that

- Merging to `main` publishes the site within a few minutes. Cloudflare publishes `main` even if the tests fail, so merge only pull requests whose **Test** check is green.
- Every pull request also gets its own preview link from Cloudflare, posted on the pull request.
- `public/_headers` sets response headers: security headers on every page, and long caching for the hashed files in `/_astro/`.
- The site is built for the root of its domain. To serve it from a sub-path, change `base` in `astro.config.mjs`.

## Refresh the data (yearly)

1. Update `data/NourishScope_Kentucky_County_Dataset_v1.0.xlsx`.
   - If a column's year changes (for example `arc_status_fy2027` becomes `arc_status_fy2028`), rename the header, then update that row's `field` and `data_year` in the `Data_Dictionary` sheet. Leave `key` unchanged.
2. Run `npm run build-data`. It stops with a clear message if anything is missing or blank where it shouldn't be.
3. Record the refresh date and source releases on the Changelog page.

`scripts/fill_nourishscope_dataset.py` fetches the Census and CDC figures. It still writes a CSV and needs updating to write the workbook directly; this is a planned follow-up. Keep CDC PLACES on the 2024 release until CDC restores the Kentucky measures.

## Licences

- Code: MIT (`LICENSE`)
- Content, methodology and compiled data: CC BY 4.0 (`LICENSE-CONTENT`)
