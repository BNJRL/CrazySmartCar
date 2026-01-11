/**
 * Main game class - Infinite training with dynamic configuration
 */
class Game {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');

        // UI Elements - Global stats
        this.generationEl = document.getElementById('generation');
        this.aliveEl = document.getElementById('alive');
        this.bestFitnessEl = document.getElementById('bestFitness');
        this.bestLapsEl = document.getElementById('bestLaps');
        this.bestLapTimeEl = document.getElementById('bestLapTime');
        this.diversityEl = document.getElementById('diversity');
        this.stagnationEl = document.getElementById('stagnation');

        // UI Elements - Best car
        this.currentCheckpointsEl = document.getElementById('currentCheckpoints');
        this.currentSpeedEl = document.getElementById('currentSpeed');
        this.currentFitnessEl = document.getElementById('currentFitness');
        this.currentNoveltyEl = document.getElementById('currentNovelty');

        // UI Elements - Controls
        this.startBtn = document.getElementById('startBtn');
        this.resetBtn = document.getElementById('resetBtn');
        this.speedBtn = document.getElementById('speedBtn');

        // Game state
        this.running = false;
        this.speed = 1;
        this.showSensors = true;

        // Game components (will be initialized by loadTrackByNumber)
        this.track = null;
        this.ga = null;
        this.cars = [];

        // Draw mode state
        this.isDrawing = false;
        this.drawnPoints = [];
        this.isDragging = false;
        this.drawModeIndicator = document.getElementById('drawModeIndicator');
        this.drawTrackBtn = document.getElementById('drawTrackBtn');
        this.clearDrawBtn = document.getElementById('clearDrawBtn');

        // Set start mode state
        this.isSettingStart = false;
        this.setStartBtn = document.getElementById('setStartBtn');

        // Track progression state
        this.currentTrackNumber = 1;
        this.unlockedTracks = [1]; // Only track 1 is unlocked at start
        this.lapCompleted = false; // Flag to detect when a car completes a lap

        // Track selection UI elements
        this.trackButtons = [
            document.getElementById('track1Btn'),
            document.getElementById('track2Btn'),
            document.getElementById('track3Btn'),
            document.getElementById('track4Btn')
        ];
        this.nextTrackBtn = document.getElementById('nextTrackBtn');
        this.callTeacherText = document.getElementById('callTeacherText');

        // Setup events
        this.setupEvents();
        this.setupConfigEvents();

        // Sync UI with Config values
        Config.syncUIInputs();

        // Setup track progression events
        this.setupTrackProgressionEvents();

        // First render
        this.updateUI();
        this.draw();

        // Load track 1 by default
        this.loadTrackByNumber(1);

        console.log('Game initialized');
    }

    /**
     * Setup basic events
     */
    setupEvents() {
        this.startBtn.addEventListener('click', () => {
            this.running = !this.running;
            this.startBtn.textContent = this.running ? 'Pause' : 'Start';
            this.startBtn.style.background = this.running ? '#e67e22' : '#4ecca3';
            if (this.running) {
                this.loop();
            }
        });

        this.resetBtn.addEventListener('click', () => this.reset());

        this.speedBtn.addEventListener('click', () => {
            const speeds = [1, 2, 5, 10, 15];
            const currentIndex = speeds.indexOf(this.speed);
            this.speed = speeds[(currentIndex + 1) % speeds.length];
            this.speedBtn.textContent = `Speed: ${this.speed}x`;
        });

        // Keyboard shortcuts
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
                    const speeds = [1, 2, 5, 10, 15];
                    const idx = speeds.indexOf(this.speed);
                    this.speed = speeds[Math.max(0, idx - 1)];
                    this.speedBtn.textContent = `Speed: ${this.speed}x`;
                    break;
            }
        });

        // Save/load buttons
        const saveBtn = document.getElementById('saveBtn');
        const loadBtn = document.getElementById('loadBtn');
        const loadFile = document.getElementById('loadFile');
        const saveStatus = document.getElementById('saveStatus');

        saveBtn.addEventListener('click', () => this.saveModel(saveStatus));
        loadBtn.addEventListener('click', () => loadFile.click());
        loadFile.addEventListener('change', (e) => this.loadModel(e, saveStatus));

        // Track buttons
        const saveTrackBtn = document.getElementById('saveTrackBtn');
        const loadTrackBtn = document.getElementById('loadTrackBtn');
        const loadTrackFile = document.getElementById('loadTrackFile');

        saveTrackBtn.addEventListener('click', () => this.saveTrack(saveStatus));
        loadTrackBtn.addEventListener('click', () => loadTrackFile.click());
        loadTrackFile.addEventListener('change', (e) => this.loadTrack(e, saveStatus));

        // Draw track button
        this.drawTrackBtn.addEventListener('click', () => {
            this.toggleDrawMode();
        });

        // Clear drawing button
        this.clearDrawBtn.addEventListener('click', () => {
            this.clearDrawing();
        });

        // Set start button
        this.setStartBtn.addEventListener('click', () => {
            this.toggleSetStartMode();
        });

        // Mouse events for drawing and start placement
        this.canvas.addEventListener('mousedown', (e) => {
            if (this.isSettingStart) {
                this.handleSetStartClick(e);
            } else if (this.isDrawing) {
                this.handleDrawMouseDown(e);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => {
            if (this.isDrawing && this.isDragging) {
                this.handleDrawMouseMove(e);
            }
        });

        this.canvas.addEventListener('mouseup', () => {
            if (this.isDrawing) {
                this.isDragging = false;
            }
        });

        // Disable context menu on canvas to allow right-click
        this.canvas.addEventListener('contextmenu', (e) => {
            if (this.isDrawing) {
                e.preventDefault();
            }
        });
    }

    /**
     * Setup track progression events
     */
    setupTrackProgressionEvents() {
        // Track selection buttons
        this.trackButtons.forEach((btn, index) => {
            if (btn) {
                btn.addEventListener('click', () => {
                    const trackNum = index + 1;
                    if (this.unlockedTracks.includes(trackNum)) {
                        this.loadTrackByNumber(trackNum);
                    }
                });
            }
        });

        // Next track button
        if (this.nextTrackBtn) {
            this.nextTrackBtn.addEventListener('click', () => {
                if (this.lapCompleted && this.currentTrackNumber < 4) {
                    this.unlockNextTrack();
                }
            });
        }
    }

    /**
     * Load a specific track by number
     */
    loadTrackByNumber(trackNumber) {
        // Use built-in track data to avoid CORS issues with file:// protocol
        const data = BUILT_IN_TRACKS[trackNumber];
        if (!data || !data.points || !Array.isArray(data.points)) {
            console.error(`Track ${trackNumber} not found or invalid format`);
            return;
        }

        // Load track
        this.drawnPoints = data.points;
        this.track = new Track(this.drawnPoints, data.startX, data.startY, data.startAngle);

            // Reset AI
            this.ga = new GeneticAlgorithm(Config.genetic.populationSize);
            this.ga.reset();
            this.cars = this.ga.createPopulation(this.track);

            // Update state
            this.currentTrackNumber = trackNumber;
            this.lapCompleted = false;

            // Update UI
            this.updateTrackButtonsUI();
            this.updateNextTrackButton();
            this.updateUI();
            this.draw();

            console.log(`Track ${trackNumber} loaded: ${this.track.checkpoints.length} checkpoints`);

        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
            saveStatus.textContent = `Track ${trackNumber} loaded!`;
            saveStatus.className = 'save-status success';
            setTimeout(() => { saveStatus.textContent = ''; }, 2000);
        }
    }

    /**
     * Update track selection buttons UI
     */
    updateTrackButtonsUI() {
        this.trackButtons.forEach((btn, index) => {
            if (!btn) return;
            const trackNum = index + 1;

            btn.classList.remove('active', 'locked', 'unlocked');

            if (trackNum === this.currentTrackNumber) {
                btn.classList.add('active');
                btn.disabled = false;
            } else if (this.unlockedTracks.includes(trackNum)) {
                btn.classList.add('unlocked');
                btn.disabled = false;
            } else {
                btn.classList.add('locked');
                btn.disabled = true;
            }
        });
    }

    /**
     * Update next track button state
     */
    updateNextTrackButton() {
        if (!this.nextTrackBtn || !this.callTeacherText) return;

        if (this.lapCompleted && this.currentTrackNumber < 4) {
            this.nextTrackBtn.disabled = false;
            this.nextTrackBtn.classList.add('ready');
            this.callTeacherText.style.display = 'block';
        } else {
            this.nextTrackBtn.disabled = true;
            this.nextTrackBtn.classList.remove('ready');
            this.callTeacherText.style.display = 'none';
        }
    }

    /**
     * Switch to next track (already unlocked)
     */
    unlockNextTrack() {
        const nextTrackNum = this.currentTrackNumber + 1;
        if (nextTrackNum > 4) return;

        // Reset lap completed flag for current track
        this.lapCompleted = false;

        // Load the next track (this resets AI)
        this.loadTrackByNumber(nextTrackNum);
    }

    /**
     * Check if any car has completed a lap
     */
    checkLapCompletion() {
        for (const car of this.cars) {
            if (car.laps > 0 || car.finishedLap) {
                if (!this.lapCompleted) {
                    this.lapCompleted = true;
                    // Unlock next track button immediately
                    const nextTrackNum = this.currentTrackNumber + 1;
                    if (nextTrackNum <= 4 && !this.unlockedTracks.includes(nextTrackNum)) {
                        this.unlockedTracks.push(nextTrackNum);
                    }
                    this.updateTrackButtonsUI();
                    this.updateNextTrackButton();
                    console.log(`Lap completed! Track ${nextTrackNum} unlocked.`);
                }
                return true;
            }
        }
        return false;
    }

    /**
     * Setup events for configuration panel
     */
    setupConfigEvents() {
        // List of all sliders with their ID and associated label ID
        const sliders = [
            // Network
            { id: 'hiddenSize', labelId: 'hiddenSizeValue' },
            { id: 'sensorCount', labelId: 'sensorCountValue' },
            { id: 'sensorRange', labelId: 'sensorRangeValue' },
            // Genetic
            { id: 'carCount', labelId: 'carCountValue' },
            { id: 'mutationRate', labelId: 'mutationValue' },
            { id: 'elitism', labelId: 'elitismValue' },
            { id: 'crossoverRate', labelId: 'crossoverValue' },
            // Adaptive
            { id: 'stagnationThreshold', labelId: 'stagnationThresholdValue' },
            { id: 'mutationBoost', labelId: 'mutationBoostValue' },
            // Novelty
            { id: 'noveltyWeight', labelId: 'noveltyWeightValue' },
            { id: 'archiveSize', labelId: 'archiveSizeValue' },
            { id: 'kNeighbors', labelId: 'kNeighborsValue' },
            // Sharing
            { id: 'nicheSigma', labelId: 'nicheSigmaValue' },
            // Fitness
            { id: 'checkpointWeight', labelId: 'checkpointWeightValue' },
            { id: 'approachWeight', labelId: 'approachWeightValue' },
            { id: 'speedWeight', labelId: 'speedWeightValue' },
            { id: 'explorationWeight', labelId: 'explorationWeightValue' },
            { id: 'stuckPenalty', labelId: 'stuckPenaltyValue' },
            // Physics
            { id: 'maxSpeed', labelId: 'maxSpeedValue' },
            { id: 'acceleration', labelId: 'accelerationValue', format: (v) => (v / 100).toFixed(2) },
            { id: 'friction', labelId: 'frictionValue' },
            { id: 'turnReduction', labelId: 'turnReductionValue' }
        ];

        // Add events to update labels
        sliders.forEach(({ id, labelId, format }) => {
            const slider = document.getElementById(id);
            const label = document.getElementById(labelId);
            if (slider && label) {
                slider.addEventListener('input', () => {
                    const value = format ? format(slider.value) : slider.value;
                    label.textContent = value;
                    this.markConfigChanged();
                });
            }
        });

        // Checkboxes
        const checkboxes = ['adaptiveMutation', 'noveltySearch', 'fitnessSharing'];
        checkboxes.forEach(id => {
            const checkbox = document.getElementById(id);
            if (checkbox) {
                checkbox.addEventListener('change', () => this.markConfigChanged());
            }
        });

        // Apply button
        const applyBtn = document.getElementById('applyConfigBtn');
        if (applyBtn) {
            applyBtn.addEventListener('click', () => this.applyConfig());
        }

        // Reset Config button
        const resetConfigBtn = document.getElementById('resetConfigBtn');
        if (resetConfigBtn) {
            resetConfigBtn.addEventListener('click', () => {
                Config.resetToDefaults();
                this.clearConfigChanged();
            });
        }
    }

    /**
     * Mark that configuration has changed (not applied)
     */
    markConfigChanged() {
        const panel = document.querySelector('.config-panel');
        if (panel) {
            panel.classList.add('has-changes');
        }
    }

    /**
     * Remove the change marker
     */
    clearConfigChanged() {
        const panel = document.querySelector('.config-panel');
        if (panel) {
            panel.classList.remove('has-changes');
        }
    }

    /**
     * Apply configuration and restart training
     */
    applyConfig() {
        // Load values from UI
        Config.loadFromUI();

        // Check if network structure has changed
        const networkChanged = this.checkNetworkStructureChanged();

        // Reset genetic algorithm with new parameters
        if (networkChanged) {
            // If network changed, start from scratch
            this.ga = new GeneticAlgorithm(Config.genetic.populationSize);
            this.ga.reset();
        } else {
            // Otherwise keep best brain but update parameters
            this.ga.populationSize = Config.genetic.populationSize;
        }

        // Recreate population
        this.cars = this.ga.createPopulation(this.track);

        this.clearConfigChanged();
        this.updateUI();
        this.draw();

        // Notification
        const saveStatus = document.getElementById('saveStatus');
        if (saveStatus) {
            saveStatus.textContent = trackChanged
                ? `Config applied! Track: ${this.track.checkpoints.length} checkpoints`
                : 'Configuration applied!';
            saveStatus.className = 'save-status success';
            setTimeout(() => { saveStatus.textContent = ''; }, 3000);
        }

        console.log('Configuration applied:', {
            population: Config.genetic.populationSize,
            mutation: Config.genetic.mutationRate,
            novelty: Config.novelty.enabled,
            sharing: Config.sharing.enabled,
            adaptive: Config.adaptive.enabled,
            trackWidth: Config.track.width,
            checkpoints: this.track.checkpoints.length
        });
    }

    /**
     * Check if network structure has changed
     */
    checkNetworkStructureChanged() {
        if (!this.ga.allTimeBestBrain) return false;

        const currentInputSize = this.ga.allTimeBestBrain.inputSize;
        const currentHiddenSize = this.ga.allTimeBestBrain.hiddenSize;
        const newInputSize = Config.getInputSize();
        const newHiddenSize = Config.network.hiddenSize;

        return currentInputSize !== newInputSize || currentHiddenSize !== newHiddenSize;
    }

    /**
     * Save best model to model.json
     */
    saveModel(statusEl) {
        const bestBrain = this.ga.allTimeBestBrain || this.ga.bestBrain;

        if (!bestBrain) {
            statusEl.textContent = 'No model to save';
            statusEl.className = 'save-status error';
            return;
        }

        const saveData = {
            version: 2,
            generation: this.ga.generation,
            bestFitness: this.ga.bestFitness,
            bestLaps: this.ga.bestLaps,
            bestLapTime: this.ga.bestLapTime,
            brain: bestBrain.toJSON(),
            config: {
                network: Config.network,
                genetic: Config.genetic,
                adaptive: Config.adaptive,
                novelty: Config.novelty,
                sharing: Config.sharing,
                fitness: Config.fitness,
                physics: Config.physics
            },
            customTrackPoints: this.drawnPoints.length > 0 ? this.drawnPoints : null,
            date: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(saveData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'model.json';
        a.click();

        URL.revokeObjectURL(url);

        statusEl.textContent = `Model Gen ${this.ga.generation} saved!`;
        statusEl.className = 'save-status success';
    }

    /**
     * Auto-load model.json at startup (disabled for track progression mode)
     */
    async autoLoadModel() {
        // Disabled - tracks are now loaded automatically via loadTrackByNumber
        // Users can still manually load models via the Load button
    }

    /**
     * Load a saved model
     */
    loadModel(event, statusEl) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.brain) {
                    throw new Error('Invalid format');
                }

                // Restaurer la config si présente
                if (data.config) {
                    Object.assign(Config.network, data.config.network || {});
                    Object.assign(Config.genetic, data.config.genetic || {});
                    Object.assign(Config.adaptive, data.config.adaptive || {});
                    Object.assign(Config.novelty, data.config.novelty || {});
                    Object.assign(Config.sharing, data.config.sharing || {});
                    Object.assign(Config.fitness, data.config.fitness || {});
                    Object.assign(Config.physics, data.config.physics || {});
                    Config.syncUIInputs();
                }

                // Load brain
                const loadedBrain = NeuralNetwork.fromJSON(data.brain);
                this.ga = new GeneticAlgorithm(Config.genetic.populationSize);
                this.ga.allTimeBestBrain = loadedBrain;
                this.ga.bestBrain = loadedBrain.clone();
                this.ga.bestFitness = data.bestFitness || 0;
                this.ga.bestLaps = data.bestLaps || 0;
                this.ga.bestLapTime = data.bestLapTime || Infinity;

                // Restore custom track if present
                if (data.customTrackPoints) {
                    this.drawnPoints = data.customTrackPoints;
                    this.track = new Track(this.drawnPoints);
                }

                // Create new population based on this brain
                this.cars = this.ga.createPopulation(this.track);

                statusEl.textContent = `Model Gen ${data.generation} loaded!`;
                statusEl.className = 'save-status success';

                this.updateUI();
                this.draw();

            } catch (err) {
                statusEl.textContent = 'Error: invalid file';
                statusEl.className = 'save-status error';
                console.error(err);
            }
        };
        reader.readAsText(file);

        event.target.value = '';
    }

    /**
     * Reset the game
     */
    reset() {
        this.running = false;
        this.startBtn.textContent = 'Start';
        this.startBtn.style.background = '#4ecca3';
        if (this.ga && this.track) {
            this.ga.reset();
            this.ga.populationSize = Config.genetic.populationSize;
            this.cars = this.ga.createPopulation(this.track);
        }
        // Don't reset lapCompleted here - keep progress for current track
        this.updateUI();
        this.draw();
    }

    /**
     * Main loop - Infinite training
     */
    loop() {
        if (!this.running) return;

        // Execute multiple frames if speed > 1
        for (let i = 0; i < this.speed; i++) {
            this.update();
        }

        this.draw();
        this.updateUI();

        requestAnimationFrame(() => this.loop());
    }

    /**
     * Update game state
     */
    update() {
        // Skip if track not loaded yet
        if (!this.track || !this.ga) return;

        // Update each car
        for (const car of this.cars) {
            car.update(this.track.walls, this.track.checkpoints);
        }

        // Check if any car completed a lap
        this.checkLapCompletion();

        // If all cars are dead, new generation
        if (this.ga.allDead(this.cars)) {
            this.cars = this.ga.evolve(this.cars, this.track);
        }
    }

    /**
     * Update user interface
     */
    updateUI() {
        // Skip if GA not initialized yet
        if (!this.ga) return;

        const stats = this.ga.getStats(this.cars);

        // Global stats
        if (this.generationEl) this.generationEl.textContent = stats.generation;
        if (this.aliveEl) this.aliveEl.textContent = stats.alive;
        if (this.bestFitnessEl) this.bestFitnessEl.textContent = stats.bestFitness;
        if (this.bestLapsEl) this.bestLapsEl.textContent = stats.bestLaps;
        if (this.bestLapTimeEl) this.bestLapTimeEl.textContent = stats.bestLapTime;
        if (this.diversityEl) this.diversityEl.textContent = stats.diversity;
        if (this.stagnationEl) this.stagnationEl.textContent = stats.stagnation;

        // Stats of best alive car
        const best = stats.bestAliveCar;
        const totalCheckpoints = this.track ? this.track.checkpoints.length : 0;
        if (best) {
            if (this.currentCheckpointsEl) {
                this.currentCheckpointsEl.textContent = `${best.checkpointIndex}/${totalCheckpoints}`;
            }
            if (this.currentSpeedEl) {
                this.currentSpeedEl.textContent = Math.abs(best.speed).toFixed(2);
            }
            if (this.currentFitnessEl) {
                this.currentFitnessEl.textContent = Math.round(best.fitness);
            }
            if (this.currentNoveltyEl) {
                this.currentNoveltyEl.textContent = Math.round(best.novelty || 0);
            }
        } else {
            if (this.currentCheckpointsEl) this.currentCheckpointsEl.textContent = '-';
            if (this.currentSpeedEl) this.currentSpeedEl.textContent = '-';
            if (this.currentFitnessEl) this.currentFitnessEl.textContent = '-';
            if (this.currentNoveltyEl) this.currentNoveltyEl.textContent = '-';
        }
    }

    /**
     * Draw the game
     */
    draw() {
        // Clear
        this.ctx.fillStyle = '#1a1a2e';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Track (if not in draw mode and track exists)
        if (!this.isDrawing && this.track) {
            this.track.draw(this.ctx);
        }

        // Find best alive car
        const aliveCars = this.cars.filter(car => car.alive);
        let bestAliveCar = null;
        if (aliveCars.length > 0) {
            bestAliveCar = aliveCars.reduce((best, car) =>
                car.fitness > best.fitness ? car : best, aliveCars[0]);
        }

        // Draw dead cars first
        const deadCars = this.cars.filter(car => !car.alive);
        for (const car of deadCars) {
            car.draw(this.ctx, false);
        }

        // Then alive ones
        for (const car of aliveCars) {
            const showSensors = this.showSensors && car === bestAliveCar;
            car.draw(this.ctx, showSensors);
        }

        // Generation indicator at top left of canvas
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(5, 5, 180, 85);
        this.ctx.fillStyle = '#9b59b6';
        this.ctx.font = 'bold 14px Arial';
        this.ctx.fillText(`Track ${this.currentTrackNumber}`, 12, 22);
        this.ctx.fillStyle = '#4ecca3';
        this.ctx.fillText(`Generation: ${this.ga ? this.ga.generation : 0}`, 12, 40);
        this.ctx.fillStyle = '#fff';
        this.ctx.font = '12px Arial';
        this.ctx.fillText(`Alive: ${aliveCars.length}/${this.cars.length}`, 12, 58);
        this.ctx.fillText(`Mutation: ${this.ga ? this.ga.getStats(this.cars).mutationRate : 0}%`, 12, 75);

        // Track preview in draw mode
        if (this.isDrawing && this.drawnPoints.length > 1) {
            const smoothedPoints = this.smoothPoints(this.drawnPoints);
            this.drawTrackPreview(smoothedPoints);
        }

        // Draw points and lines in draw mode
        if (this.isDrawing) {
            this.ctx.strokeStyle = '#4ecca3';
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            for (let i = 0; i < this.drawnPoints.length; i++) {
                const p = this.drawnPoints[i];
                if (i === 0) {
                    this.ctx.moveTo(p.x, p.y);
                } else {
                    this.ctx.lineTo(p.x, p.y);
                }
            }
            this.ctx.stroke();

            // Individual points
            this.ctx.fillStyle = '#4ecca3';
            for (const p of this.drawnPoints) {
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
                this.ctx.fill();
            }
        }
    }

    /**
     * Toggle draw mode
     */
    toggleDrawMode() {
        this.isDrawing = !this.isDrawing;
        this.drawModeIndicator.style.display = this.isDrawing ? 'block' : 'none';
        this.clearDrawBtn.style.display = this.isDrawing ? 'inline-block' : 'none';
        this.canvas.classList.toggle('draw-mode', this.isDrawing);
        this.drawTrackBtn.textContent = this.isDrawing ? 'Finish Drawing' : 'Draw Track';

        if (this.isDrawing) {
            this.running = false;
            this.startBtn.textContent = 'Start';
            this.startBtn.style.background = '#4ecca3';
            this.drawnPoints = [];
        } else {
            // Generate track from drawn points (smoothed)
            if (this.drawnPoints.length > 2) {
                const smoothedPoints = this.smoothPoints(this.drawnPoints);
                this.track = new Track(smoothedPoints);
                this.ga = new GeneticAlgorithm(Config.genetic.populationSize);
                this.ga.reset();
                this.cars = this.ga.createPopulation(this.track);
                this.updateUI();
            }
        }
        this.draw();
    }

    /**
     * Clear current drawing
     */
    clearDrawing() {
        this.drawnPoints = [];
        this.draw();
    }

    /**
     * Handle mouse click in draw mode
     */
    handleDrawMouseDown(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        if (e.button === 0) {
            this.isDragging = true;
            this.drawnPoints.push({ x, y });
        } else if (e.button === 2) {
            e.preventDefault();
            if (this.drawnPoints.length > 0) {
                this.drawnPoints.pop();
            }
        }
        this.draw();
    }

    /**
     * Handle mouse move in draw mode (drag)
     */
    handleDrawMouseMove(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        const lastPoint = this.drawnPoints[this.drawnPoints.length - 1];
        if (lastPoint) {
            const dist = Math.sqrt((x - lastPoint.x) ** 2 + (y - lastPoint.y) ** 2);
            if (dist > 10) {
                this.drawnPoints.push({ x, y });
                this.draw();
            }
        }
    }

    /**
     * Smooth points to reduce noise and simplify track
     */
    smoothPoints(points) {
        if (points.length < 3) return points;

        const smoothed = [];
        const step = Math.max(1, Math.floor(points.length / 50));

        for (let i = 0; i < points.length; i += step) {
            smoothed.push(points[i]);
        }

        if (smoothed.length > 1) {
            const first = smoothed[0];
            const last = smoothed[smoothed.length - 1];
            const dist = Math.sqrt((first.x - last.x) ** 2 + (first.y - last.y) ** 2);
            if (dist > 20) {
                smoothed.push({ x: first.x, y: first.y });
            }
        }

        return smoothed;
    }

    /**
     * Draw track preview during draw mode
     */
    drawTrackPreview(points) {
        if (points.length < 2) return;

        const ctx = this.ctx;
        const trackWidth = Config.track.width;

        const outerPoints = [];
        const innerPoints = [];

        for (let i = 0; i < points.length; i++) {
            const prev = points[(i - 1 + points.length) % points.length];
            const curr = points[i];
            const next = points[(i + 1) % points.length];

            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len < 0.001) continue;

            const nx = -dy / len;
            const ny = dx / len;

            const halfWidth = trackWidth / 2;
            outerPoints.push({
                x: curr.x + nx * halfWidth,
                y: curr.y + ny * halfWidth
            });
            innerPoints.push({
                x: curr.x - nx * halfWidth,
                y: curr.y - ny * halfWidth
            });
        }

        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i < outerPoints.length; i++) {
            const p = outerPoints[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.strokeStyle = '#ff4444';
        ctx.beginPath();
        for (let i = 0; i < innerPoints.length; i++) {
            const p = innerPoints[i];
            if (i === 0) ctx.moveTo(p.x, p.y);
            else ctx.lineTo(p.x, p.y);
        }
        ctx.closePath();
        ctx.stroke();

        ctx.globalAlpha = 1;
    }

    /**
     * Toggle set start mode
     */
    toggleSetStartMode() {
        this.isSettingStart = !this.isSettingStart;
        this.setStartBtn.textContent = this.isSettingStart ? 'Cancel Placement' : 'Set Start';
        this.canvas.classList.toggle('set-start-mode', this.isSettingStart);
        if (this.isSettingStart) {
            this.running = false;
            this.startBtn.textContent = 'Start';
            this.startBtn.style.background = '#4ecca3';
        }
    }

    /**
     * Handle click to set start position
     */
    handleSetStartClick(e) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;

        let angle = 0;
        if (this.track.outerPoints.length > 0) {
            let closestDist = Infinity;
            let closestIndex = 0;
            for (let i = 0; i < this.track.outerPoints.length; i++) {
                const dist = Math.sqrt((x - this.track.outerPoints[i].x) ** 2 + (y - this.track.outerPoints[i].y) ** 2);
                if (dist < closestDist) {
                    closestDist = dist;
                    closestIndex = i;
                }
            }
            const prev = this.track.outerPoints[(closestIndex - 1 + this.track.outerPoints.length) % this.track.outerPoints.length];
            const next = this.track.outerPoints[(closestIndex + 1) % this.track.outerPoints.length];
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            angle = Math.atan2(dy, dx);
        }

        this.track.setStart(x, y, angle);
        this.ga = new GeneticAlgorithm(Config.genetic.populationSize);
        this.ga.reset();
        this.cars = this.ga.createPopulation(this.track);
        this.updateUI();
        this.toggleSetStartMode();
        this.draw();
    }

    /**
     * Save custom track to track.json
     */
    saveTrack(statusEl) {
        if (this.drawnPoints.length < 3) {
            statusEl.textContent = 'No custom track to save';
            statusEl.className = 'save-status error';
            return;
        }

        const trackData = {
            version: 1,
            points: this.drawnPoints,
            startX: this.track.startX,
            startY: this.track.startY,
            startAngle: this.track.startAngle,
            date: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(trackData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = 'track.json';
        a.click();

        URL.revokeObjectURL(url);

        statusEl.textContent = 'Track saved!';
        statusEl.className = 'save-status success';
    }

    /**
     * Load a saved track
     */
    loadTrack(event, statusEl) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!data.points || !Array.isArray(data.points)) {
                    throw new Error('Invalid format');
                }

                this.drawnPoints = data.points;
                this.track = new Track(this.drawnPoints, data.startX, data.startY, data.startAngle);
                this.ga = new GeneticAlgorithm(Config.genetic.populationSize);
                this.ga.reset();
                this.cars = this.ga.createPopulation(this.track);

                statusEl.textContent = 'Track loaded!';
                statusEl.className = 'save-status success';

                this.updateUI();
                this.draw();

            } catch (err) {
                statusEl.textContent = 'Error: invalid file';
                statusEl.className = 'save-status error';
                console.error(err);
            }
        };
        reader.readAsText(file);

        event.target.value = '';
    }
}

// Start the game
window.addEventListener('load', () => {
    const game = new Game();
});
