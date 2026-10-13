/** Explicit markers for the two kinds of blank the source data allows (plan R7). */
export type Suppressed = { status: 'suppressed' };
export type NotApplicable = { status: 'not_applicable' };

/** One Kentucky county, keyed by stable, year-free field keys (plan R5). */
export interface County {
  county_name: string;
  fips: string;
  state: string;
  appalachian: string;
  arc_status: string | NotApplicable;
  metro_nonmetro: number;
  population: number;
  total_households: number;
  snap_households: number;
  snap_household_pct: number;
  poverty_rate: number;
  child_poverty_rate: number;
  persistent_poverty: number;
  median_household_income: number;
  diabetes_pct: number;
  obesity_pct: number;
  high_bp_pct: number;
  low_income_low_access_pct: number;
  grocery_stores_per_1000: number | Suppressed;
  snap_retailers: number;
  farmers_markets: number;
  farmers_markets_snap: number;
}

/** One Data_Dictionary row, as the app sees it. */
export interface FieldInfo {
  key: string;
  /** The workbook header, which may carry a year (e.g. arc_status_fy2027). */
  field: string;
  pillar: string;
  description: string;
  source_label: string;
  data_year: string;
  /** False for identifiers; user-entered fields are left out entirely. */
  public: boolean;
}
