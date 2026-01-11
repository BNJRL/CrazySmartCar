/**
 * Advanced genetic algorithm with:
 * - Adaptive mutation
 * - Novelty Search
 * - Fitness Sharing
 */
class GeneticAlgorithm {
    constructor(populationSize, mutationRate = 0.15) {
        this.populationSize = populationSize;
        this.mutationRate = mutationRate;
        this.generation = 1;
        this.bestFitness = 0;
        this.bestLaps = 0;
        this.bestLapTime = Infinity;
        this.bestBrain = null;
        this.allTimeBestBrain = null;

        // Stagnation statistics
        this.stagnationCounter = 0;
        this.lastBestFitness = 0;

        // Archive for Novelty Search
        this.noveltyArchive = new NoveltyArchive();

        // Diversity statistics
        this.diversity = 0;
    }

    /**
     * Create a new population of cars
     */
    createPopulation(track) {
        const cars = [];
        const inputSize = Config.network.sensorCount + 3; // sensors + speed + direction (x,y)

        for (let i = 0; i < this.populationSize; i++) {
            let car;
            if (this.allTimeBestBrain) {
                car = new Car(track.startX, track.startY, track.startAngle, this.allTimeBestBrain.clone());
                if (i > 0) {
                    const mutationStrength = this.getCurrentMutationRate() * (0.5 + (i / this.populationSize));
                    car.brain.mutate(mutationStrength);
                }
            } else {
                car = new Car(track.startX, track.startY, track.startAngle);
            }
            cars.push(car);
        }
        return cars;
    }

    /**
     * Get current mutation rate (with adaptation)
     */
    getCurrentMutationRate() {
        let rate = Config.genetic.mutationRate;

        if (Config.adaptive.enabled) {
            // Increase mutation if stagnation detected
            const stagnationBoost = Math.min(
                this.stagnationCounter / Config.adaptive.stagnationThreshold,
                1
            ) * Config.adaptive.mutationBoost;

            rate += stagnationBoost;
        }

        return Math.min(rate, 0.8); // Cap at 80%
    }

    /**
     * Calculate behavioral distance between two cars
     */
    behaviorDistance(car1, car2) {
        const posDist = Math.sqrt(
            Math.pow(car1.x - car2.x, 2) +
            Math.pow(car1.y - car2.y, 2)
        );
        const cpDist = Math.abs(car1.checkpointsPassed - car2.checkpointsPassed) * 100;
        return posDist + cpDist;
    }

    /**
     * Apply Fitness Sharing
     * Penalizes individuals that are too similar
     */
    applyFitnessSharing(cars) {
        if (!Config.sharing.enabled) return;

        const sigma = Config.sharing.sigma;

        for (const car of cars) {
            let sharingSum = 0;

            for (const other of cars) {
                if (car === other) continue;

                const distance = this.behaviorDistance(car, other);
                if (distance < sigma) {
                    // Sharing function: 1 - (d/sigma)
                    sharingSum += 1 - (distance / sigma);
                }
            }

            // Shared fitness = fitness / (1 + number of similar neighbors)
            car.sharedFitness = car.fitness / (1 + sharingSum);
        }
    }

    /**
     * Calculate and apply novelty scores
     */
    applyNoveltyScores(cars) {
        if (!Config.novelty.enabled) return;

        for (const car of cars) {
            const behavior = this.noveltyArchive.getBehaviorDescriptor(car);
            car.novelty = this.noveltyArchive.calculateNovelty(behavior);

            // Combine fitness and novelty according to weight
            const noveltyWeight = Config.novelty.weight;
            const fitnessWeight = 1 - noveltyWeight;

            // Normalize scores (approximation)
            const normalizedFitness = car.fitness / 10000;
            const normalizedNovelty = car.novelty / 500;

            car.combinedScore = fitnessWeight * normalizedFitness + noveltyWeight * normalizedNovelty;

            // Add to archive if novel enough
            this.noveltyArchive.maybeAdd(behavior, car.novelty);
        }
    }

    /**
     * Calculate population diversity
     */
    calculateDiversity(cars) {
        if (cars.length < 2) return 0;

        let totalDistance = 0;
        let count = 0;

        for (let i = 0; i < Math.min(cars.length, 20); i++) {
            for (let j = i + 1; j < Math.min(cars.length, 20); j++) {
                totalDistance += this.behaviorDistance(cars[i], cars[j]);
                count++;
            }
        }

        this.diversity = count > 0 ? totalDistance / count : 0;
        return this.diversity;
    }

    /**
     * Select best individuals
     */
    selection(cars) {
        // Apply advanced mechanisms
        this.applyFitnessSharing(cars);
        this.applyNoveltyScores(cars);
        this.calculateDiversity(cars);

        // Determine sorting metric
        let sortKey;
        if (Config.novelty.enabled) {
            sortKey = (car) => car.combinedScore || car.fitness;
        } else if (Config.sharing.enabled) {
            sortKey = (car) => car.sharedFitness || car.fitness;
        } else {
            sortKey = (car) => car.fitness;
        }

        // Sort by chosen metric
        const sorted = [...cars].sort((a, b) => sortKey(b) - sortKey(a));

        // Update records
        const best = sorted[0];
        const bestFitness = best.fitness;

        // Stagnation detection
        if (bestFitness <= this.lastBestFitness * 1.01) {
            this.stagnationCounter++;
        } else {
            this.stagnationCounter = 0;
        }
        this.lastBestFitness = bestFitness;

        if (bestFitness > this.bestFitness) {
            this.bestFitness = bestFitness;
            this.bestBrain = best.brain.clone();
        }

        if (best.laps > this.bestLaps) {
            this.bestLaps = best.laps;
        }

        if (best.bestLapTime < this.bestLapTime) {
            this.bestLapTime = best.bestLapTime;
        }

        // Save all-time best brain
        if (!this.allTimeBestBrain || bestFitness >= this.bestFitness) {
            this.allTimeBestBrain = best.brain.clone();
        }

        // Return best (top 25%)
        const eliteCount = Math.max(4, Math.floor(this.populationSize * 0.25));
        return sorted.slice(0, eliteCount);
    }

    /**
     * Create new generation from best individuals
     */
    evolve(cars, track) {
        const elite = this.selection(cars);
        const newCars = [];
        const elitismCount = Config.genetic.elitism;

        // Elitism: keep best without modification
        for (let i = 0; i < elitismCount && i < elite.length; i++) {
            const car = new Car(track.startX, track.startY, track.startAngle, elite[i].brain.clone());
            car.isBest = (i === 0);
            car.color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32';
            newCars.push(car);
        }

        // Fill rest of population
        const mutationRate = this.getCurrentMutationRate();

        while (newCars.length < this.populationSize) {
            const parent1 = this.tournamentSelect(elite);
            const parent2 = this.tournamentSelect(elite);

            let childBrain;
            if (Math.random() < Config.genetic.crossoverRate) {
                childBrain = NeuralNetwork.crossover(parent1.brain, parent2.brain);
            } else {
                childBrain = parent1.brain.clone();
            }

            // Mutation
            childBrain.mutate(mutationRate);

            // Occasional hypermutation if strong stagnation
            if (this.stagnationCounter > Config.adaptive.stagnationThreshold * 2) {
                if (Math.random() < 0.1) {
                    // 10% chance of hypermutation
                    childBrain.mutate(0.5);
                }
            }

            const car = new Car(track.startX, track.startY, track.startAngle, childBrain);
            newCars.push(car);
        }

        this.generation++;
        return newCars;
    }

    /**
     * Tournament selection
     */
    tournamentSelect(elite) {
        const tournamentSize = Math.min(4, elite.length);
        let best = elite[Math.floor(Math.random() * elite.length)];

        for (let i = 1; i < tournamentSize; i++) {
            const competitor = elite[Math.floor(Math.random() * elite.length)];
            const bestScore = Config.novelty.enabled ? (best.combinedScore || best.fitness) : best.fitness;
            const competitorScore = Config.novelty.enabled ? (competitor.combinedScore || competitor.fitness) : competitor.fitness;

            if (competitorScore > bestScore) {
                best = competitor;
            }
        }

        return best;
    }

    /**
     * Check if all cars are dead
     */
    allDead(cars) {
        return cars.every(car => !car.alive);
    }

    /**
     * Get current statistics
     */
    getStats(cars) {
        const alive = cars.filter(car => car.alive).length;
        const aliveCars = cars.filter(car => car.alive);

        let bestAliveCar = null;
        if (aliveCars.length > 0) {
            bestAliveCar = aliveCars.reduce((best, car) =>
                car.fitness > best.fitness ? car : best, aliveCars[0]);
        }

        return {
            generation: this.generation,
            alive: alive,
            bestFitness: Math.round(this.bestFitness),
            bestLaps: this.bestLaps,
            bestLapTime: this.bestLapTime < Infinity ? (this.bestLapTime / 60).toFixed(2) + 's' : '--',
            bestAliveCar: bestAliveCar,
            stagnation: this.stagnationCounter,
            diversity: Math.round(this.diversity),
            mutationRate: Math.round(this.getCurrentMutationRate() * 100)
        };
    }

    /**
     * Reset algorithm
     */
    reset() {
        this.generation = 1;
        this.bestFitness = 0;
        this.bestLaps = 0;
        this.bestLapTime = Infinity;
        this.bestBrain = null;
        this.allTimeBestBrain = null;
        this.stagnationCounter = 0;
        this.lastBestFitness = 0;
        this.diversity = 0;
        this.noveltyArchive.reset();
    }
}
