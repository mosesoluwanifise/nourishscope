# NourishScope

NourishScope is a free, browser-based decision-support tool. It helps community nutrition programs in Kentucky decide where to direct limited resources. It covers three areas: Nutrition, Community Health, and Food System and Agricultural Sustainability.

Everything runs in the visitor's browser. There are no accounts and no server, and data users upload never leaves their device.

- **Live site:** https://mosesoluwanifise.github.io/nourishscope/
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

```bash
npm test
```

## Licences

- Code: MIT (`LICENSE`)
- Content, methodology and compiled data: CC BY 4.0 (`LICENSE-CONTENT`)
