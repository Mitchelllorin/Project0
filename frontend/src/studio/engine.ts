export type Vector3 = [number, number, number];
export interface AssemblyPart {
  id: string; name: string; category: 'panel' | 'hardware' | 'fastener';
  position: Vector3; size: Vector3; rotation: Vector3; assembly_axis: Vector3;
  parent_id: string | null; assembly_order: number; travel: number;
  geometry: string; material: string; machining: Record<string, any>;
}

export function stageProgress(amount: number, stage: number): number {
  const starts = [0, 0, .3, .65];
  const lengths = [1, .34, .35, .35];
  return Math.max(0, Math.min(1, (amount - starts[stage]) / lengths[stage]));
}

export function displacement(part: AssemblyPart, parts: AssemblyPart[], amount: number, depth = 0): Vector3 {
  if (depth > 8) return [0, 0, 0];
  const parent = parts.find(p => p.id === part.parent_id);
  const inherited = parent ? displacement(parent, parts, amount, depth + 1) : [0, 0, 0];
  const progress = stageProgress(amount, part.assembly_order);
  return part.assembly_axis.map((axis, i) => inherited[i] + axis * part.travel * progress) as Vector3;
}

export function explodedPosition(part: AssemblyPart, parts: AssemblyPart[], amount: number): Vector3 {
  const delta = displacement(part, parts, amount);
  return part.position.map((n, i) => (n + delta[i]) / 1000) as Vector3;
}

export function formatDimension(mm: number, unit: string = 'mm'): string {
  return unit === 'in' ? `${(mm / 25.4).toLocaleString('en-US', {maximumFractionDigits: 2})} in` : `${Math.round(mm).toLocaleString('en-US')} mm`;
}

export const money = (n: number, decimals: number = 0) => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD', minimumFractionDigits: decimals, maximumFractionDigits: decimals}).format(n);