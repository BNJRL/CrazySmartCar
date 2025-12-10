/**
 * Algorithme génétique pour l'évolution des voitures
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
    }

    /**
     * Crée une nouvelle population de voitures
     */
    createPopulation(track) {
        const cars = [];
        for (let i = 0; i < this.populationSize; i++) {
            let car;
            // Si on a un meilleur cerveau all-time, l'utiliser pour quelques voitures
            if (this.allTimeBestBrain && i < 5) {
                car = new Car(track.startX, track.startY, track.startAngle, this.allTimeBestBrain.clone());
                if (i > 0) {
                    car.brain.mutate(this.mutationRate * 0.5);
                }
            } else {
                car = new Car(track.startX, track.startY, track.startAngle);
            }
            cars.push(car);
        }
        return cars;
    }

    /**
     * Sélectionne les meilleurs individus
     */
    selection(cars) {
        // Trier par fitness décroissant
        const sorted = [...cars].sort((a, b) => b.fitness - a.fitness);

        // Mettre à jour les records
        const best = sorted[0];
        if (best.fitness > this.bestFitness) {
            this.bestFitness = best.fitness;
            this.bestBrain = best.brain.clone();
        }

        if (best.laps > this.bestLaps) {
            this.bestLaps = best.laps;
        }

        if (best.bestLapTime < this.bestLapTime) {
            this.bestLapTime = best.bestLapTime;
        }

        // Sauvegarder le meilleur cerveau all-time
        if (!this.allTimeBestBrain || best.fitness > this.bestFitness * 0.9) {
            this.allTimeBestBrain = best.brain.clone();
        }

        // Retourner les meilleurs (top 25%)
        const eliteCount = Math.max(4, Math.floor(this.populationSize * 0.25));
        return sorted.slice(0, eliteCount);
    }

    /**
     * Crée une nouvelle génération à partir des meilleurs
     */
    evolve(cars, track) {
        const elite = this.selection(cars);
        const newCars = [];

        // Élitisme: garder les 3 meilleurs sans modification
        for (let i = 0; i < 3 && i < elite.length; i++) {
            const car = new Car(track.startX, track.startY, track.startAngle, elite[i].brain.clone());
            car.isBest = (i === 0);
            car.color = i === 0 ? '#FFD700' : i === 1 ? '#C0C0C0' : '#CD7F32';
            newCars.push(car);
        }

        // Remplir le reste de la population
        while (newCars.length < this.populationSize) {
            const parent1 = this.tournamentSelect(elite);
            const parent2 = this.tournamentSelect(elite);

            let childBrain;
            if (Math.random() < 0.75) {
                childBrain = NeuralNetwork.crossover(parent1.brain, parent2.brain);
            } else {
                childBrain = parent1.brain.clone();
            }

            // Mutation adaptative (plus forte si pas de progrès)
            const mutationStrength = this.mutationRate;
            childBrain.mutate(mutationStrength);

            const car = new Car(track.startX, track.startY, track.startAngle, childBrain);
            newCars.push(car);
        }

        this.generation++;
        return newCars;
    }

    /**
     * Sélection par tournoi
     */
    tournamentSelect(elite) {
        const tournamentSize = Math.min(4, elite.length);
        let best = elite[Math.floor(Math.random() * elite.length)];

        for (let i = 1; i < tournamentSize; i++) {
            const competitor = elite[Math.floor(Math.random() * elite.length)];
            if (competitor.fitness > best.fitness) {
                best = competitor;
            }
        }

        return best;
    }

    /**
     * Vérifie si toutes les voitures sont mortes
     */
    allDead(cars) {
        return cars.every(car => !car.alive);
    }

    /**
     * Récupère les statistiques actuelles
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
            bestAliveCar: bestAliveCar
        };
    }

    /**
     * Réinitialise l'algorithme
     */
    reset() {
        this.generation = 1;
        this.bestFitness = 0;
        this.bestLaps = 0;
        this.bestLapTime = Infinity;
        this.bestBrain = null;
        this.allTimeBestBrain = null;
    }
}
