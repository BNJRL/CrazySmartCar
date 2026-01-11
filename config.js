/**
 * Centralized configuration for all AI parameters
 * Allows dynamic modification from the interface
 */
const Config = {
    // Neural network
    network: {
        hiddenSize: 6,       // Number of neurons in hidden layer (min)
        sensorCount: 3,      // Number of sensors (min)
        sensorRange: 50      // Sensor range in pixels (min)
    },

    // Genetic algorithm
    genetic: {
        populationSize: 20,  // Number of cars (min)
        mutationRate: 0.01,  // Base mutation rate (0-1) (min)
        elitism: 1,          // Number of elites kept without modification (min)
        crossoverRate: 0     // Crossover probability vs clone (min)
    },

    // Adaptive mutation
    adaptive: {
        enabled: false,          // Enable adaptive mutation (disabled by default)
        stagnationThreshold: 2,  // Generations without improvement before boost (min)
        mutationBoost: 0.10      // Maximum additional mutation (0-1) (min)
    },

    // Novelty Search
    novelty: {
        enabled: false,      // Enable novelty search
        weight: 0,           // Novelty weight vs fitness (0 = fitness, 1 = novelty) (min)
        archiveSize: 20,     // Max behavior archive size (min)
        kNeighbors: 5        // K neighbors for novelty calculation (min)
    },

    // Fitness Sharing
    sharing: {
        enabled: false,      // Enable fitness sharing
        sigma: 10            // Niche radius (behavior distance) (min)
    },

    // Reward Shaping (fitness weights)
    fitness: {
        checkpointWeight: 100,    // Points per checkpoint (min)
        approachWeight: 0,        // Points for approaching next CP (min)
        speedWeight: 0,           // Points for average speed (min)
        explorationWeight: 0,     // Points for explored areas (min)
        stuckPenalty: 0,          // Penalty per stuck unit (min)
        wrongWayPenalty: 100,     // Penalty for wrong direction
        lapBonus: 100000          // Bonus for complete lap
    },

    // Track (fixed values, not user-configurable)
    track: {
        width: 55,               // Track width in pixels
        checkpointDensity: 15    // Minimum angle (degrees) to create checkpoint
    },

    // Car physics
    physics: {
        maxSpeed: 3,
        acceleration: 0.10,
        friction: 0.01,
        turnSpeed: 0.06,
        turnReduction: 0     // Turn reduction at max speed (0-1) (min)
    },

    // Utility methods
    getInputSize() {
        // 7 sensors + speed + checkpoint direction (x, y) = 10
        return this.network.sensorCount + 3;
    },

    // Load from interface
    loadFromUI() {
        // Network
        this.network.hiddenSize = parseInt(document.getElementById('hiddenSize')?.value || 14);
        this.network.sensorCount = parseInt(document.getElementById('sensorCount')?.value || 7);
        this.network.sensorRange = parseInt(document.getElementById('sensorRange')?.value || 120);

        // Genetic
        this.genetic.populationSize = parseInt(document.getElementById('carCount')?.value || 50);
        this.genetic.mutationRate = parseInt(document.getElementById('mutationRate')?.value || 15) / 100;
        this.genetic.elitism = parseInt(document.getElementById('elitism')?.value || 3);
        this.genetic.crossoverRate = parseInt(document.getElementById('crossoverRate')?.value || 75) / 100;

        // Adaptive
        this.adaptive.enabled = document.getElementById('adaptiveMutation')?.checked ?? true;
        this.adaptive.stagnationThreshold = parseInt(document.getElementById('stagnationThreshold')?.value || 5);
        this.adaptive.mutationBoost = parseInt(document.getElementById('mutationBoost')?.value || 30) / 100;

        // Novelty
        this.novelty.enabled = document.getElementById('noveltySearch')?.checked ?? false;
        this.novelty.weight = parseInt(document.getElementById('noveltyWeight')?.value || 50) / 100;
        this.novelty.archiveSize = parseInt(document.getElementById('archiveSize')?.value || 100);
        this.novelty.kNeighbors = parseInt(document.getElementById('kNeighbors')?.value || 15);

        // Sharing
        this.sharing.enabled = document.getElementById('fitnessSharing')?.checked ?? false;
        this.sharing.sigma = parseInt(document.getElementById('nicheSigma')?.value || 50);

        // Fitness
        this.fitness.checkpointWeight = parseInt(document.getElementById('checkpointWeight')?.value || 1000);
        this.fitness.approachWeight = parseInt(document.getElementById('approachWeight')?.value || 500);
        this.fitness.speedWeight = parseInt(document.getElementById('speedWeight')?.value || 50);
        this.fitness.explorationWeight = parseInt(document.getElementById('explorationWeight')?.value || 0);
        this.fitness.stuckPenalty = parseInt(document.getElementById('stuckPenalty')?.value || 50);


        // Physics
        this.physics.maxSpeed = parseFloat(document.getElementById('maxSpeed')?.value || 6);
        this.physics.acceleration = parseInt(document.getElementById('acceleration')?.value || 25) / 100;
        this.physics.friction = parseInt(document.getElementById('friction')?.value || 5) / 100;
        this.physics.turnReduction = parseInt(document.getElementById('turnReduction')?.value || 60) / 100;
    },

    // Update value display
    updateUILabels() {
        const updates = [
            ['hiddenSizeValue', this.network.hiddenSize],
            ['sensorCountValue', this.network.sensorCount],
            ['sensorRangeValue', this.network.sensorRange],
            ['carCountValue', this.genetic.populationSize],
            ['mutationValue', Math.round(this.genetic.mutationRate * 100)],
            ['elitismValue', this.genetic.elitism],
            ['crossoverValue', Math.round(this.genetic.crossoverRate * 100)],
            ['stagnationThresholdValue', this.adaptive.stagnationThreshold],
            ['mutationBoostValue', Math.round(this.adaptive.mutationBoost * 100)],
            ['noveltyWeightValue', Math.round(this.novelty.weight * 100)],
            ['archiveSizeValue', this.novelty.archiveSize],
            ['kNeighborsValue', this.novelty.kNeighbors],
            ['nicheSigmaValue', this.sharing.sigma],
            ['checkpointWeightValue', this.fitness.checkpointWeight],
            ['approachWeightValue', this.fitness.approachWeight],
            ['speedWeightValue', this.fitness.speedWeight],
            ['explorationWeightValue', this.fitness.explorationWeight],
            ['stuckPenaltyValue', this.fitness.stuckPenalty],
            ['maxSpeedValue', this.physics.maxSpeed],
            ['accelerationValue', this.physics.acceleration.toFixed(2)],
            ['frictionValue', Math.round(this.physics.friction * 100)],
            ['turnReductionValue', Math.round(this.physics.turnReduction * 100)]
        ];

        updates.forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value;
        });
    },

    // Reset to default values (all minimums)
    resetToDefaults() {
        this.network = { hiddenSize: 6, sensorCount: 3, sensorRange: 50 };
        this.genetic = { populationSize: 20, mutationRate: 0.01, elitism: 1, crossoverRate: 0 };
        this.adaptive = { enabled: false, stagnationThreshold: 2, mutationBoost: 0.10 };
        this.novelty = { enabled: false, weight: 0, archiveSize: 20, kNeighbors: 5 };
        this.sharing = { enabled: false, sigma: 10 };
        this.fitness = { checkpointWeight: 100, approachWeight: 0, speedWeight: 0, explorationWeight: 0, stuckPenalty: 0, wrongWayPenalty: 100, lapBonus: 100000 };
        this.track = { width: 55, checkpointDensity: 15 };
        this.physics = { maxSpeed: 3, acceleration: 0.10, friction: 0.01, turnSpeed: 0.06, turnReduction: 0 };

        // Update inputs
        this.syncUIInputs();
    },

    // Sync inputs with current values
    syncUIInputs() {
        const inputs = [
            ['hiddenSize', this.network.hiddenSize],
            ['sensorCount', this.network.sensorCount],
            ['sensorRange', this.network.sensorRange],
            ['carCount', this.genetic.populationSize],
            ['mutationRate', Math.round(this.genetic.mutationRate * 100)],
            ['elitism', this.genetic.elitism],
            ['crossoverRate', Math.round(this.genetic.crossoverRate * 100)],
            ['adaptiveMutation', this.adaptive.enabled],
            ['stagnationThreshold', this.adaptive.stagnationThreshold],
            ['mutationBoost', Math.round(this.adaptive.mutationBoost * 100)],
            ['noveltySearch', this.novelty.enabled],
            ['noveltyWeight', Math.round(this.novelty.weight * 100)],
            ['archiveSize', this.novelty.archiveSize],
            ['kNeighbors', this.novelty.kNeighbors],
            ['fitnessSharing', this.sharing.enabled],
            ['nicheSigma', this.sharing.sigma],
            ['checkpointWeight', this.fitness.checkpointWeight],
            ['approachWeight', this.fitness.approachWeight],
            ['speedWeight', this.fitness.speedWeight],
            ['explorationWeight', this.fitness.explorationWeight],
            ['stuckPenalty', this.fitness.stuckPenalty],
            ['maxSpeed', this.physics.maxSpeed],
            ['acceleration', Math.round(this.physics.acceleration * 100)],
            ['friction', Math.round(this.physics.friction * 100)],
            ['turnReduction', Math.round(this.physics.turnReduction * 100)]
        ];

        inputs.forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = value;
                } else {
                    el.value = value;
                }
            }
        });

        this.updateUILabels();
    }
};


/**
 * Class to manage novelty search
 */
class NoveltyArchive {
    constructor() {
        this.behaviors = [];
    }

    /**
     * Extract behavior descriptor from a car
     */
    getBehaviorDescriptor(car) {
        return {
            finalX: car.x,
            finalY: car.y,
            maxCheckpoints: car.checkpointsPassed,
            maxDistance: car.totalDistance,
            avgSpeed: car.avgSpeed
        };
    }

    /**
     * Calculate distance between two behaviors
     */
    behaviorDistance(b1, b2) {
        const posWeight = 1;
        const cpWeight = 100;
        const distWeight = 0.1;

        const posDist = Math.sqrt(
            Math.pow(b1.finalX - b2.finalX, 2) +
            Math.pow(b1.finalY - b2.finalY, 2)
        );
        const cpDist = Math.abs(b1.maxCheckpoints - b2.maxCheckpoints) * cpWeight;
        const distDist = Math.abs(b1.maxDistance - b2.maxDistance) * distWeight;

        return posDist * posWeight + cpDist + distDist;
    }

    /**
     * Calculate novelty of a behavior
     */
    calculateNovelty(behavior) {
        if (this.behaviors.length === 0) {
            return 1000; // First car = very novel
        }

        // Calculate distances to all archived behaviors
        const distances = this.behaviors.map(b => this.behaviorDistance(behavior, b));
        distances.sort((a, b) => a - b);

        // Average of K nearest neighbors
        const k = Math.min(Config.novelty.kNeighbors, distances.length);
        const kNearest = distances.slice(0, k);
        const avgDist = kNearest.reduce((a, b) => a + b, 0) / k;

        return avgDist;
    }

    /**
     * Add behavior to archive if novel enough
     */
    maybeAdd(behavior, novelty) {
        const threshold = 50; // Minimum novelty threshold

        if (novelty > threshold || this.behaviors.length < 10) {
            this.behaviors.push(behavior);

            // Limit archive size
            if (this.behaviors.length > Config.novelty.archiveSize) {
                // Remove oldest behavior
                this.behaviors.shift();
            }
        }
    }

    /**
     * Reset archive
     */
    reset() {
        this.behaviors = [];
    }
}
