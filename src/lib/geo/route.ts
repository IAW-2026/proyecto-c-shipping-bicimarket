import { haversineKm } from "./distance";

interface Point {
  lat: number;
  lng: number;
}

export interface BestRoute {
  totalKm: number;
  orderedSequence: number[]; // índices de pickups en el orden óptimo de visita
}

/**
 * Resuelve la ruta más corta que visita todos los `pickups` y termina en
 * `destination`. El operador puede arrancar desde cualquier pickup, así
 * que el orden de visita es libre — solo el destino queda fijo al final.
 *
 * Estrategia:
 *   - N ≤ 8 → brute force (todas las permutaciones de pickups, N=8 → 40320).
 *   - N > 8 → heurística nearest-neighbor: arranca en el pickup más cercano
 *     al destino, salta al más próximo no visitado, termina en destino.
 *
 * No usa ningún dato de red real (no APIs externas), solo Haversine sobre
 * lat/lng. Suficientemente bueno para mostrar costo aproximado y ordenar.
 */
export function bestRoute(pickups: Point[], destination: Point): BestRoute {
  const n = pickups.length;
  if (n === 0) return { totalKm: 0, orderedSequence: [] };
  if (n === 1) {
    return {
      totalKm: haversineKm(pickups[0], destination),
      orderedSequence: [0],
    };
  }

  if (n <= 8) return bruteForce(pickups, destination);
  return nearestNeighbor(pickups, destination);
}

function bruteForce(pickups: Point[], destination: Point): BestRoute {
  const indices = pickups.map((_, i) => i);
  let bestKm = Infinity;
  let bestSeq: number[] = indices;

  for (const perm of permutations(indices)) {
    let km = 0;
    for (let i = 0; i < perm.length - 1; i++) {
      km += haversineKm(pickups[perm[i]], pickups[perm[i + 1]]);
    }
    km += haversineKm(pickups[perm[perm.length - 1]], destination);
    if (km < bestKm) {
      bestKm = km;
      bestSeq = perm;
    }
  }

  return { totalKm: bestKm, orderedSequence: bestSeq };
}

function nearestNeighbor(pickups: Point[], destination: Point): BestRoute {
  const remaining = new Set(pickups.map((_, i) => i));
  let currentIdx = -1;
  let closestToDestKm = Infinity;
  for (const i of remaining) {
    const d = haversineKm(pickups[i], destination);
    if (d < closestToDestKm) {
      closestToDestKm = d;
      currentIdx = i;
    }
  }
  const sequence: number[] = [];
  let totalKm = 0;
  let prev: Point | null = null;
  while (remaining.size > 0) {
    if (currentIdx === -1) break;
    if (prev !== null) totalKm += haversineKm(prev, pickups[currentIdx]);
    sequence.push(currentIdx);
    remaining.delete(currentIdx);
    prev = pickups[currentIdx];
    let nextIdx = -1;
    let nextKm = Infinity;
    for (const i of remaining) {
      const d = haversineKm(prev, pickups[i]);
      if (d < nextKm) {
        nextKm = d;
        nextIdx = i;
      }
    }
    currentIdx = nextIdx;
  }
  if (prev !== null) totalKm += haversineKm(prev, destination);
  return { totalKm, orderedSequence: sequence };
}

function* permutations<T>(arr: T[]): Generator<T[]> {
  if (arr.length <= 1) {
    yield arr.slice();
    return;
  }
  for (let i = 0; i < arr.length; i++) {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const perm of permutations(rest)) {
      yield [arr[i], ...perm];
    }
  }
}
