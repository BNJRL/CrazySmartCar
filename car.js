/**
 * Classe représentant une voiture avec ses capteurs et son réseau de neurones
 */
class Car {
    constructor(x, y, angle, brain = null) {
        // Position et orientation
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.startX = x;
        this.startY = y;
        this.startAngle = angle;

        // Physique
        this.speed = 0;
        this.maxSpeed = 6;
        this.acceleration = 0.25;
        this.friction = 0.05;
        this.turnSpeed = 0.06;

        // Dimensions de la voiture
        this.width = 25;
        this.height = 12;

        // État
        this.alive = true;
        this.fitness = 0;
        this.totalDistance = 0;  // Distance totale parcourue
        this.lapDistance = 0;    // Distance pour le tour actuel
        this.checkpointIndex = 0;
        this.checkpointsPassed = 0; // Total checkpoints passés (tous tours confondus)
        this.laps = 0;           // Nombre de tours complétés
        this.lapTimes = [];      // Temps par tour
        this.currentLapTime = 0; // Temps du tour en cours
        this.bestLapTime = Infinity;
        this.frameCount = 0;
        this.stuckCounter = 0;   // Compteur pour détecter si bloqué
        this.lastX = x;
        this.lastY = y;
        this.finishedLap = false;  // A terminé un tour

        // Stats pour le fitness
        this.avgSpeed = 0;
        this.maxSpeedReached = 0;
        this.totalSpeed = 0;
        this.speedSamples = 0;
        this.maxDistFromStart = 0; // Distance max depuis le départ

        // Capteurs (7 rayons pour plus de précision)
        this.sensorCount = 7;
        this.sensorLength = 120;
        this.sensorAngles = [
            -Math.PI / 2,      // Gauche 90°
            -Math.PI / 3,      // Gauche 60°
            -Math.PI / 6,      // Gauche 30°
            0,                  // Devant
            Math.PI / 6,       // Droite 30°
            Math.PI / 3,       // Droite 60°
            Math.PI / 2        // Droite 90°
        ];
        this.sensorReadings = new Array(this.sensorCount).fill(1);

        // Réseau de neurones
        // Entrées: 7 capteurs + vitesse + angle de braquage = 9 entrées
        // Sorties: accélérer, freiner, tourner gauche, tourner droite = 4 sorties
        if (brain) {
            this.brain = brain;
        } else {
            this.brain = new NeuralNetwork(9, 12, 4);
        }

        // Couleur
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.isBest = false;
    }

    /**
     * Réinitialise la voiture à sa position de départ
     */
    reset() {
        this.x = this.startX;
        this.y = this.startY;
        this.angle = this.startAngle;
        this.speed = 0;
        this.alive = true;
        this.fitness = 0;
        this.totalDistance = 0;
        this.lapDistance = 0;
        this.checkpointIndex = 0;
        this.checkpointsPassed = 0;
        this.laps = 0;
        this.lapTimes = [];
        this.currentLapTime = 0;
        this.bestLapTime = Infinity;
        this.frameCount = 0;
        this.stuckCounter = 0;
        this.lastX = this.startX;
        this.lastY = this.startY;
        this.finishedLap = false;
        this.avgSpeed = 0;
        this.maxSpeedReached = 0;
        this.totalSpeed = 0;
        this.speedSamples = 0;
        this.maxDistFromStart = 0;
        this.sensorReadings = new Array(this.sensorCount).fill(1);
    }

    /**
     * Met à jour les capteurs en fonction des murs du circuit
     */
    updateSensors(walls) {
        for (let i = 0; i < this.sensorCount; i++) {
            const sensorAngle = this.angle + this.sensorAngles[i];
            const endX = this.x + Math.cos(sensorAngle) * this.sensorLength;
            const endY = this.y + Math.sin(sensorAngle) * this.sensorLength;

            let minDistance = 1;

            for (const wall of walls) {
                const intersection = this.getLineIntersection(
                    this.x, this.y, endX, endY,
                    wall.x1, wall.y1, wall.x2, wall.y2
                );

                if (intersection) {
                    const distance = Math.sqrt(
                        Math.pow(intersection.x - this.x, 2) +
                        Math.pow(intersection.y - this.y, 2)
                    ) / this.sensorLength;

                    if (distance < minDistance) {
                        minDistance = distance;
                    }
                }
            }

            this.sensorReadings[i] = minDistance;
        }
    }

    /**
     * Calcule l'intersection entre deux segments de ligne
     */
    getLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
        const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
        if (Math.abs(denom) < 0.0001) return null;

        const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
        const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

        if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
            return {
                x: x1 + t * (x2 - x1),
                y: y1 + t * (y2 - y1)
            };
        }
        return null;
    }

    /**
     * Vérifie si la voiture est en collision avec les murs
     */
    checkCollision(walls) {
        const corners = this.getCorners();

        for (let i = 0; i < corners.length; i++) {
            const next = (i + 1) % corners.length;
            for (const wall of walls) {
                if (this.getLineIntersection(
                    corners[i].x, corners[i].y,
                    corners[next].x, corners[next].y,
                    wall.x1, wall.y1, wall.x2, wall.y2
                )) {
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Récupère les coins de la voiture
     */
    getCorners() {
        const cos = Math.cos(this.angle);
        const sin = Math.sin(this.angle);
        const hw = this.width / 2;
        const hh = this.height / 2;

        return [
            { x: this.x + cos * hw - sin * hh, y: this.y + sin * hw + cos * hh },
            { x: this.x + cos * hw + sin * hh, y: this.y + sin * hw - cos * hh },
            { x: this.x - cos * hw + sin * hh, y: this.y - sin * hw - cos * hh },
            { x: this.x - cos * hw - sin * hh, y: this.y - sin * hw + cos * hh }
        ];
    }

    /**
     * Vérifie si la voiture a passé un checkpoint dans le BON SENS
     * Le checkpoint 0 (ligne d'arrivée) ne donne PAS de récompense directe
     * Seuls les checkpoints 1-9 donnent des récompenses
     */
    checkCheckpoints(checkpoints) {
        const totalCheckpoints = checkpoints.length;
        const cp = checkpoints[this.checkpointIndex];
        const corners = this.getCorners();

        for (let i = 0; i < corners.length; i++) {
            const next = (i + 1) % corners.length;
            if (this.getLineIntersection(
                corners[i].x, corners[i].y,
                corners[next].x, corners[next].y,
                cp.x1, cp.y1, cp.x2, cp.y2
            )) {
                // Vérifier que la voiture va dans le bon sens
                const carDirX = Math.cos(this.angle);
                const carDirY = Math.sin(this.angle);
                const dotProduct = carDirX * cp.dirX + carDirY * cp.dirY;

                if (dotProduct > 0.1) {
                    // Compteur de checkpoints passés (pour le fitness)
                    this.checkpointsPassed++;
                    this.stuckCounter = 0; // Reset du compteur bloqué

                    this.checkpointIndex++;

                    // Tour complété (après avoir passé tous les checkpoints 1-9 puis le 0)
                    if (this.checkpointIndex >= totalCheckpoints) {
                        this.checkpointIndex = 0;
                        this.laps++;

                        if (this.currentLapTime > 0) {
                            this.lapTimes.push(this.currentLapTime);
                            if (this.currentLapTime < this.bestLapTime) {
                                this.bestLapTime = this.currentLapTime;
                            }
                        }
                        this.currentLapTime = 0;
                        this.lapDistance = 0;

                        // MORT après avoir complété un tour (objectif atteint)
                        this.finishedLap = true;
                    }

                    return true;
                }
                return false;
            }
        }
        return false;
    }

    /**
     * Calcule le fitness de la voiture
     * Basé sur: tours complétés + temps de tour + checkpoints + vitesse
     * PÉNALITÉ si la voiture est arrêtée
     */
    calculateFitness() {
        // PRIORITÉ 1: Tours complétés (énorme bonus)
        const lapScore = this.laps * 50000;

        // PRIORITÉ 2: Bonus pour temps de tour rapide (si tour complété)
        let lapTimeBonus = 0;
        if (this.bestLapTime < Infinity) {
            // Plus le temps est court, plus le bonus est grand
            // Temps de référence: 1000 frames = temps "normal"
            lapTimeBonus = Math.max(0, (2000 - this.bestLapTime)) * 10;
        }

        // PRIORITÉ 3: Nombre de checkpoints passés (encourage la progression)
        const checkpointScore = this.checkpointsPassed * 1000;

        // SECONDAIRE: Distance max depuis le départ (évite les voitures qui tournent en rond)
        const distanceScore = this.maxDistFromStart * 2;

        // BONUS: Vitesse moyenne (encourage à aller vite)
        const speedScore = this.avgSpeed * 100;

        // PÉNALITÉ: Temps passé à l'arrêt (décourage l'immobilité)
        const stuckPenalty = this.stuckCounter * 50;

        this.fitness = lapScore + lapTimeBonus + checkpointScore + distanceScore + speedScore - stuckPenalty;
        return this.fitness;
    }

    /**
     * Met à jour la voiture (appelé à chaque frame)
     */
    update(walls, checkpoints) {
        if (!this.alive) return;

        this.frameCount++;
        this.currentLapTime++;

        // Mettre à jour les capteurs
        this.updateSensors(walls);

        // Obtenir les décisions du réseau de neurones
        const normalizedSpeed = this.speed / this.maxSpeed;
        const inputs = [...this.sensorReadings, normalizedSpeed, Math.sin(this.angle)];
        const outputs = this.brain.predict(inputs);

        // Interpréter les sorties
        // Accélérer
        if (outputs[0] > 0.5) {
            this.speed += this.acceleration;
        }
        // Freiner (mais pas de marche arrière)
        if (outputs[1] > 0.5) {
            this.speed -= this.acceleration * 0.8;
        }
        // Tourner (seulement si on avance)
        if (this.speed > 0.1) {
            if (outputs[2] > 0.5) {
                this.angle -= this.turnSpeed;
            }
            if (outputs[3] > 0.5) {
                this.angle += this.turnSpeed;
            }
        }

        // Friction
        this.speed *= (1 - this.friction);

        // PAS de marche arrière - vitesse minimum = 0
        this.speed = Math.max(0, Math.min(this.maxSpeed, this.speed));

        // Stats de vitesse (seulement si on avance)
        if (this.speed > 0) {
            this.totalSpeed += this.speed;
            this.speedSamples++;
            this.avgSpeed = this.speedSamples > 0 ? this.totalSpeed / this.speedSamples : 0;
            if (this.speed > this.maxSpeedReached) {
                this.maxSpeedReached = this.speed;
            }
        }

        // Mettre à jour la position
        const prevX = this.x;
        const prevY = this.y;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Distance parcourue
        const dist = Math.sqrt(Math.pow(this.x - prevX, 2) + Math.pow(this.y - prevY, 2));
        this.totalDistance += dist;
        this.lapDistance += dist;

        // Distance depuis le départ (pour le fitness)
        const distFromStart = Math.sqrt(
            Math.pow(this.x - this.startX, 2) +
            Math.pow(this.y - this.startY, 2)
        );
        if (distFromStart > this.maxDistFromStart) {
            this.maxDistFromStart = distFromStart;
        }

        // Détection de blocage : si la voiture n'a pas bougé significativement
        if (this.frameCount % 30 === 0) { // Vérifier toutes les 30 frames
            const movement = Math.sqrt(
                Math.pow(this.x - this.lastX, 2) +
                Math.pow(this.y - this.lastY, 2)
            );
            if (movement < 5) { // Moins de 5 pixels en 30 frames = bloqué
                this.stuckCounter++;
            } else {
                this.stuckCounter = Math.max(0, this.stuckCounter - 1);
            }
            this.lastX = this.x;
            this.lastY = this.y;
        }

        // Vérifier les checkpoints
        this.checkCheckpoints(checkpoints);

        // Calculer le fitness
        this.calculateFitness();

        // MORT: Collision avec un mur
        if (this.checkCollision(walls)) {
            this.alive = false;
        }

        // MORT: Bloqué trop longtemps (10 vérifications = 300 frames = 5 secondes à 60fps)
        if (this.stuckCounter > 10) {
            this.alive = false;
        }

        // MORT: A terminé un tour (objectif atteint, on passe à la suite)
        if (this.finishedLap) {
            this.alive = false;
        }
    }

    /**
     * Dessine la voiture sur le canvas
     */
    draw(ctx, showSensors = false) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Corps de la voiture
        if (this.alive) {
            ctx.fillStyle = this.isBest ? '#FFD700' : this.color;
            ctx.globalAlpha = this.isBest ? 1 : 0.6;
        } else {
            ctx.fillStyle = '#333';
            ctx.globalAlpha = 0.2;
        }

        // Forme de voiture plus stylisée
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 4, -this.height / 2);
        ctx.lineTo(-this.width / 2, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 4, this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Indicateur avant
        if (this.alive) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(this.width / 4, -this.height / 4, this.width / 5, this.height / 2);
        }

        ctx.restore();

        // Dessiner les capteurs
        if (showSensors && this.alive) {
            ctx.globalAlpha = 0.6;
            for (let i = 0; i < this.sensorCount; i++) {
                const sensorAngle = this.angle + this.sensorAngles[i];
                const endX = this.x + Math.cos(sensorAngle) * this.sensorLength * this.sensorReadings[i];
                const endY = this.y + Math.sin(sensorAngle) * this.sensorLength * this.sensorReadings[i];

                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(endX, endY);

                const hue = this.sensorReadings[i] * 120;
                ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(endX, endY, 3, 0, Math.PI * 2);
                ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
                ctx.fill();
            }
            ctx.globalAlpha = 1;
        }
    }
}
