/**
 * Classe principale du jeu - Entraînement infini
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // Éléments UI - Stats globales
        this.generationEl = document.getElementById('generation');
        this.aliveEl = document.getElementById('alive');
        this.bestFitnessEl = document.getElementById('bestFitness');
        this.bestLapsEl = document.getElementById('bestLaps');
        this.bestLapTimeEl = document.getElementById('bestLapTime');

        // Éléments UI - Meilleure voiture
        this.currentLapsEl = document.getElementById('currentLaps');
        this.currentCheckpointsEl = document.getElementById('currentCheckpoints');
        this.currentSpeedEl = document.getElementById('currentSpeed');
        this.avgSpeedEl = document.getElementById('avgSpeed');
        this.maxSpeedEl = document.getElementById('maxSpeed');
        this.totalDistanceEl = document.getElementById('totalDistance');
        this.efficiencyEl = document.getElementById('efficiency');
        this.currentFitnessEl = document.getElementById('currentFitness');

        // Éléments UI - Contrôles
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.speedBtn = document.getElementById('speedBtn');
        this.carCountInput = document.getElementById('carCount');
        this.carCountValue = document.getElementById('carCountValue');
        this.mutationRateInput = document.getElementById('mutationRate');
        this.mutationValueEl = document.getElementById('mutationValue');

        // État du jeu
        this.running = false;
        this.speed = 1;
        this.showSensors = true;

        // Composants du jeu
        this.track = new Track();
        this.ga = new GeneticAlgorithm(
            parseInt(this.carCountInput.value),
            parseInt(this.mutationRateInput.value) / 100
        );
        this.cars = this.ga.createPopulation(this.track);

        // Configurer les événements
        this.setupEvents();

        // Premier rendu
        this.updateUI();
        this.draw();

        // Charger automatiquement le modèle s'il existe
        this.autoLoadModel();

        console.log('Jeu initialisé -', this.cars.length, 'voitures,', this.track.walls.length, 'murs,', this.track.checkpoints.length, 'checkpoints');
    }

    /**
     * Configure les événements
     */
    setupEvents() {
        this.startBtn.addEventListener('click', () => {
            this.running = !this.running;
            this.startBtn.textContent = this.running ? 'Pause' : 'Démarrer';
            this.startBtn.style.background = this.running ? '#e67e22' : '#4ecca3';
            if (this.running) {
                this.loop();
            }
        });

        this.resetBtn.addEventListener('click', () => this.reset());

        this.speedBtn.addEventListener('click', () => {
            const speeds = [1, 2, 5, 10, 20];
            const currentIndex = speeds.indexOf(this.speed);
            this.speed = speeds[(currentIndex + 1) % speeds.length];
            this.speedBtn.textContent = `Vitesse: ${this.speed}x`;
        });

        this.carCountInput.addEventListener('input', () => {
            this.carCountValue.textContent = this.carCountInput.value;
        });

        this.carCountInput.addEventListener('change', () => {
            this.ga.populationSize = parseInt(this.carCountInput.value);
        });

        this.mutationRateInput.addEventListener('input', () => {
            const value = this.mutationRateInput.value;
            this.mutationValueEl.textContent = `${value}%`;
            this.ga.mutationRate = value / 100;
        });

        // Raccourcis clavier
        document.addEventListener('keydown', (e) => {
            switch (e.key) {
                case 's':
                case 'S':
                    this.showSensors = !this.showSensors;
                    break;
                case ' ':
                    this.startBtn.click();
                    e.preventDefault();
                    break;
                case '+':
                case '=':
                    this.speedBtn.click();
                    break;
                case '-':
                    const speeds = [1, 2, 5, 10, 20];
                    const idx = speeds.indexOf(this.speed);
                    this.speed = speeds[Math.max(0, idx - 1)];
                    this.speedBtn.textContent = `Vitesse: ${this.speed}x`;
                    break;
            }
        });

        // Boutons de sauvegarde/chargement
        const saveBtn = document.getElementById('saveBtn');
        const loadBtn = document.getElementById('loadBtn');
        const loadFile = document.getElementById('loadFile');
        const saveStatus = document.getElementById('saveStatus');

        saveBtn.addEventListener('click', () => this.saveModel(saveStatus));
        loadBtn.addEventListener('click', () => loadFile.click());
        loadFile.addEventListener('change', (e) => this.loadModel(e, saveStatus));
    }

    /**
     * Sauvegarde le meilleur modèle dans model.json
     */
    saveModel(statusEl) {
        const bestBrain = this.ga.allTimeBestBrain || this.ga.bestBrain;

        if (!bestBrain) {
            statusEl.textContent = 'Aucun modèle à sauvegarder';
            statusEl.className = 'save-status error';
            return;
        }

        const saveData = {
            version: 1,
            generation: this.ga.generation,
            bestFitness: this.ga.bestFitness,
            bestLaps: this.ga.bestLaps,
            bestLapTime: this.ga.bestLapTime,
            brain: bestBrain.toJSON(),
            date: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'model.json';  // Nom fixe pour faciliter le chargement
        a.click();

        URL.revokeObjectURL(url);

        statusEl.textContent = `Modèle Gen ${this.ga.generation} sauvegardé !`;
        statusEl.className = 'save-status success';
    }

    /**
     * Charge automatiquement model.json au démarrage
     */
    async autoLoadModel() {
        try {
            const response = await fetch('model.json');
            if (!response.ok) return;

            const data = await response.json();
            if (!data.brain) return;

            const loadedBrain = NeuralNetwork.fromJSON(data.brain);
            this.ga.allTimeBestBrain = loadedBrain;
            this.ga.bestBrain = loadedBrain.clone();
            this.ga.bestFitness = data.bestFitness || 0;
            this.ga.bestLaps = data.bestLaps || 0;
            this.ga.bestLapTime = data.bestLapTime || Infinity;

            this.cars = this.ga.createPopulation(this.track);

            console.log(`Modèle Gen ${data.generation} chargé automatiquement`);
            const saveStatus = document.getElementById('saveStatus');
            saveStatus.textContent = `Modèle Gen ${data.generation} chargé !`;
            saveStatus.className = 'save-status success';

            this.updateUI();
            this.draw();
        } catch (e) {
            // Pas de modèle sauvegardé, on continue normalement
            console.log('Aucun modèle model.json trouvé');
        }
    }

    /**
     * Charge un modèle sauvegardé
     */
    loadModel(event, statusEl) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.brain) {
                    throw new Error('Format invalide');
                }

                // Charger le cerveau
                const loadedBrain = NeuralNetwork.fromJSON(data.brain);
                this.ga.allTimeBestBrain = loadedBrain;
                this.ga.bestBrain = loadedBrain.clone();
                this.ga.bestFitness = data.bestFitness || 0;
                this.ga.bestLaps = data.bestLaps || 0;
                this.ga.bestLapTime = data.bestLapTime || Infinity;

                // Créer une nouvelle population basée sur ce cerveau
                this.cars = this.ga.createPopulation(this.track);

                statusEl.textContent = `Modèle Gen ${data.generation} chargé !`;
                statusEl.className = 'save-status success';

                this.updateUI();
                this.draw();

            } catch (err) {
                statusEl.textContent = 'Erreur: fichier invalide';
                statusEl.className = 'save-status error';
                console.error(err);
            }
        };
        reader.readAsText(file);

        // Reset input pour permettre de recharger le même fichier
        event.target.value = '';
    }

    /**
     * Réinitialise le jeu
     */
    reset() {
        this.running = false;
        this.startBtn.textContent = 'Démarrer';
        this.startBtn.style.background = '#4ecca3';
        this.ga.reset();
        this.ga.populationSize = parseInt(this.carCountInput.value);
        this.cars = this.ga.createPopulation(this.track);
        this.updateUI();
        this.draw();
    }

    /**
     * Boucle principale - Entraînement infini
     */
    loop() {
        if (!this.running) return;

        // Exécuter plusieurs frames si vitesse > 1
        for (let i = 0; i < this.speed; i++) {
            this.update();
        }

        this.draw();
        this.updateUI();

        requestAnimationFrame(() => this.loop());
    }

    /**
     * Met à jour l'état du jeu
     */
    update() {
        // Mettre à jour chaque voiture
        for (const car of this.cars) {
            car.update(this.track.walls, this.track.checkpoints);
        }

        // Si toutes les voitures sont mortes, nouvelle génération
        if (this.ga.allDead(this.cars)) {
            this.cars = this.ga.evolve(this.cars, this.track);
        }
    }

    /**
     * Met à jour l'interface utilisateur
     */
    updateUI() {
        const stats = this.ga.getStats(this.cars);

        // Stats globales
        this.generationEl.textContent = stats.generation;
        this.aliveEl.textContent = stats.alive;
        this.bestFitnessEl.textContent = stats.bestFitness;
        this.bestLapsEl.textContent = stats.bestLaps;
        this.bestLapTimeEl.textContent = stats.bestLapTime;

        // Stats de la meilleure voiture en vie
        const best = stats.bestAliveCar;
        if (best) {
            this.currentLapsEl.textContent = best.laps;
            this.currentCheckpointsEl.textContent = `${best.checkpointIndex}/${this.track.checkpoints.length}`;
            this.currentSpeedEl.textContent = Math.abs(best.speed).toFixed(2);
            this.avgSpeedEl.textContent = best.avgSpeed.toFixed(2);
            this.maxSpeedEl.textContent = best.maxSpeedReached.toFixed(2);
            this.totalDistanceEl.textContent = Math.round(best.totalDistance);

            // Efficacité = checkpoints atteints / distance parcourue
            const efficiency = best.totalDistance > 0
                ? ((best.efficientDistance / best.totalDistance) * 100).toFixed(1)
                : 0;
            this.efficiencyEl.textContent = efficiency + '%';
            this.currentFitnessEl.textContent = Math.round(best.fitness);
        } else {
            this.currentLapsEl.textContent = '-';
            this.currentCheckpointsEl.textContent = '-';
            this.currentSpeedEl.textContent = '-';
            this.avgSpeedEl.textContent = '-';
            this.maxSpeedEl.textContent = '-';
            this.totalDistanceEl.textContent = '-';
            this.efficiencyEl.textContent = '-';
            this.currentFitnessEl.textContent = '-';
        }
    }

    /**
     * Dessine le jeu
     */
    draw() {
        // Effacer
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Circuit
        this.track.draw(this.ctx);

        // Trouver la meilleure voiture vivante
        const aliveCars = this.cars.filter(car => car.alive);
        let bestAliveCar = null;
        if (aliveCars.length > 0) {
            bestAliveCar = aliveCars.reduce((best, car) =>
                car.fitness > best.fitness ? car : best, aliveCars[0]);
        }

        // Dessiner les voitures mortes d'abord
        const deadCars = this.cars.filter(car => !car.alive);
        for (const car of deadCars) {
            car.draw(this.ctx, false);
        }

        // Puis les vivantes
        for (const car of aliveCars) {
            const showSensors = this.showSensors && car === bestAliveCar;
            car.draw(this.ctx, showSensors);
        }

        // Indicateur génération en haut à gauche du canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(5, 5, 150, 50);
        this.ctx.fillStyle = '#4ecca3';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(`Génération: ${this.ga.generation}`, 12, 25);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`En vie: ${aliveCars.length}/${this.cars.length}`, 12, 45);
    }
}

// Démarrer le jeu
window.addEventListener('load', () => {
    const game = new Game();
});
