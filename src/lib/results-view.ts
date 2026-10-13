/**
 * Pure views over the engine's results for the /app results area: the summary
 * card and the "Who gets the money" distribution. No calculation happens here;
 * everything is read from `derive()` output, so the engine's golden tests still hold.
 */
import { preciseSum, STRATEGIES, type Strategy, type StrategyResult } from './calc';
import { formatCurrency } from './format';

/** Every community at one allocation amount (several when they tie). */
export interface AllocationGroup {
  amount: number;
  names: string[];
}

export interface ResultSummary {
  communityCount: number;
  reached: number;
  spend: number;
  unspent: number;
  coverageAfter: number | null;
  largest: AllocationGroup;
  smallest: AllocationGroup;
}

function groupAt(result: StrategyResult, amount: number): AllocationGroup {
  const names = result.rows.filter((r) => r.allocation === amount).map((r) => r.name).sort((a, b) => a.localeCompare(b));
  return { amount, names };
}

export function summarise(result: StrategyResult): ResultSummary {
  const amounts = result.rows.map((r) => r.allocation);
  return {
    communityCount: result.rows.length,
    reached: result.totals.reached,
    spend: result.totals.spend,
    unspent: result.totals.unspent,
    coverageAfter: result.totals.coverageAfter,
    largest: groupAt(result, Math.max(...amounts)),
    smallest: groupAt(result, Math.min(...amounts)),
  };
}

/** One plain-language line for a group: "Magoffin County gets $26,427.28" or "2 communities get $0.00: A, B". */
function groupLine(group: AllocationGroup): string {
  const amount = formatCurrency(group.amount);
  if (group.names.length === 1) return `${group.names[0]} gets ${amount}`;
  return `${group.names.length} communities get ${amount}: ${group.names.join(', ')}`;
}

/**
 * The largest and smallest allocation as sentences. When every community gets
 * the same amount there is only one sentence, so ties are never reported as a
 * single "largest" community.
 */
export function allocationLines(summary: ResultSummary): string[] {
  const { largest, smallest, communityCount } = summary;
  if (largest.amount === smallest.amount) {
    if (communityCount === 1) return [`${largest.names[0]} gets ${formatCurrency(largest.amount)}, the whole allocation`];
    return [`All ${communityCount} communities get ${formatCurrency(largest.amount)}`];
  }
  return [`Most: ${groupLine(largest)}`, `Least: ${groupLine(smallest)}`];
}

/** One row of the distribution view: a community's allocation under every strategy. */
export interface DistributionRow {
  id: string;
  name: string;
  cells: { strategy: Strategy; allocation: number; reached: number; most: boolean }[];
}

export interface Distribution {
  rows: DistributionRow[];
  totals: { strategy: Strategy; allocation: number; reached: number }[];
}

/**
 * Each community's allocation under all five strategies, rows sorted by the
 * selected strategy's allocation (highest first, then by name). `most` marks
 * the strategy, or tied strategies, that give that community the most (none when every
 * strategy gives it nothing).
 */
export function distribution(results: readonly StrategyResult[], selected: Strategy): Distribution {
  const byStrategy = new Map(results.map((r) => [r.strategy, r]));
  const ordered = STRATEGIES.map((s) => byStrategy.get(s)!);
  const rows: DistributionRow[] = ordered[0].rows.map((row, i) => {
    const cells = ordered.map((r) => ({ strategy: r.strategy, allocation: r.rows[i].allocation, reached: r.rows[i].reached, most: false }));
    const top = Math.max(...cells.map((c) => c.allocation));
    for (const c of cells) c.most = top > 0 && c.allocation === top;
    return { id: row.id, name: row.name, cells };
  });
  const sortIndex = STRATEGIES.indexOf(selected);
  rows.sort((a, b) => b.cells[sortIndex].allocation - a.cells[sortIndex].allocation || a.name.localeCompare(b.name));
  const totals = ordered.map((r) => ({
    strategy: r.strategy,
    allocation: preciseSum(r.rows.map((row) => row.allocation)),
    reached: r.totals.reached,
  }));
  return { rows, totals };
}
