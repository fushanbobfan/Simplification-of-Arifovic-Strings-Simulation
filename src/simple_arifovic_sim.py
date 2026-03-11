"""A classroom-friendly simplification of an Arifovic-style string simulation.

This version is intentionally small and readable:
- Each agent holds a binary strategy string.
- Strategy quality is measured by matching a fixed target string.
- Evolution is reduced to:
  1) selection (copy better strategies),
  2) crossover (single-point),
  3) mutation (bit flips).

The script prints generation-by-generation summary statistics and can optionally
write all generation-level results to CSV.
"""

from __future__ import annotations

import argparse
import csv
import random
from dataclasses import dataclass
from statistics import mean
from typing import List


@dataclass
class GenerationStats:
    generation: int
    best_fitness: int
    average_fitness: float
    unique_strategies: int
    best_strategy: str


def random_strategy(length: int, rng: random.Random) -> str:
    return "".join(rng.choice("01") for _ in range(length))


def fitness(strategy: str, target: str) -> int:
    """Score = number of bits matching the target string."""
    return sum(1 for s, t in zip(strategy, target) if s == t)


def tournament_select(population: List[str], scores: List[int], k: int, rng: random.Random) -> str:
    """Pick k random agents and return the highest-fitness strategy."""
    candidate_indices = [rng.randrange(len(population)) for _ in range(k)]
    winner_idx = max(candidate_indices, key=lambda idx: scores[idx])
    return population[winner_idx]


def crossover(parent_a: str, parent_b: str, rng: random.Random) -> str:
    if len(parent_a) != len(parent_b):
        raise ValueError("Parents must have equal length")
    if len(parent_a) <= 1:
        return parent_a
    cut = rng.randint(1, len(parent_a) - 1)
    return parent_a[:cut] + parent_b[cut:]


def mutate(strategy: str, mutation_rate: float, rng: random.Random) -> str:
    bits = list(strategy)
    for i, bit in enumerate(bits):
        if rng.random() < mutation_rate:
            bits[i] = "1" if bit == "0" else "0"
    return "".join(bits)


def run_simulation(
    population_size: int,
    strategy_length: int,
    generations: int,
    mutation_rate: float,
    tournament_size: int,
    crossover_rate: float,
    seed: int,
) -> List[GenerationStats]:
    rng = random.Random(seed)
    target = random_strategy(strategy_length, rng)
    population = [random_strategy(strategy_length, rng) for _ in range(population_size)]

    print(f"Target string: {target}")

    history: List[GenerationStats] = []

    for g in range(generations + 1):
        scores = [fitness(strategy, target) for strategy in population]

        best_idx = max(range(len(population)), key=lambda idx: scores[idx])
        stats = GenerationStats(
            generation=g,
            best_fitness=scores[best_idx],
            average_fitness=mean(scores),
            unique_strategies=len(set(population)),
            best_strategy=population[best_idx],
        )
        history.append(stats)

        print(
            f"gen={stats.generation:03d} "
            f"best={stats.best_fitness:02d}/{strategy_length} "
            f"avg={stats.average_fitness:.2f} "
            f"unique={stats.unique_strategies:03d} "
            f"best_strategy={stats.best_strategy}"
        )

        if g == generations:
            break

        new_population: List[str] = []
        while len(new_population) < population_size:
            parent_a = tournament_select(population, scores, tournament_size, rng)
            parent_b = tournament_select(population, scores, tournament_size, rng)

            if rng.random() < crossover_rate:
                child = crossover(parent_a, parent_b, rng)
            else:
                child = parent_a

            child = mutate(child, mutation_rate, rng)
            new_population.append(child)

        population = new_population

    return history


def write_csv(path: str, history: List[GenerationStats]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)
        writer.writerow(["generation", "best_fitness", "average_fitness", "unique_strategies", "best_strategy"])
        for row in history:
            writer.writerow([
                row.generation,
                row.best_fitness,
                f"{row.average_fitness:.4f}",
                row.unique_strategies,
                row.best_strategy,
            ])


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Simplified Arifovic-style string simulation")
    parser.add_argument("--population-size", type=int, default=60)
    parser.add_argument("--strategy-length", type=int, default=12)
    parser.add_argument("--generations", type=int, default=80)
    parser.add_argument("--mutation-rate", type=float, default=0.02)
    parser.add_argument("--tournament-size", type=int, default=3)
    parser.add_argument("--crossover-rate", type=float, default=0.8)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--csv", type=str, default="", help="Optional path to write generation-level CSV")
    return parser


def main() -> None:
    args = build_parser().parse_args()
    history = run_simulation(
        population_size=args.population_size,
        strategy_length=args.strategy_length,
        generations=args.generations,
        mutation_rate=args.mutation_rate,
        tournament_size=args.tournament_size,
        crossover_rate=args.crossover_rate,
        seed=args.seed,
    )

    if args.csv:
        write_csv(args.csv, history)
        print(f"\nWrote CSV: {args.csv}")


if __name__ == "__main__":
    main()
