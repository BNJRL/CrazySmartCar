/**
 * Class representing a car with its sensors and neural network
 * Uses Config parameters for physics and fitness
 */
class Car {
    constructor(x, y, angle, brain = null) {
        // Position and orientation
        this.x = x;
        this.y = y;
        this.angle = angle;
        this.startX = x;
        this.startY = y;
        this.startAngle = angle;

        // Physics (from Config)
        this.speed = 0;
        this.maxSpeed = Config.physics.maxSpeed;
        this.acceleration = Config.physics.acceleration;
        this.friction = Config.physics.friction;
        this.turnSpeed = Config.physics.turnSpeed;

        // Car dimensions
        this.width = 16;
        this.height = 8;

        // State
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
        this.lastX = x;
        this.lastY = y;
        this.finishedLap = false;

        // Stats for fitness
        this.avgSpeed = 0;
        this.maxSpeedReached = 0;
        this.totalSpeed = 0;
        this.speedSamples = 0;
        this.maxDistFromStart = 0;
        this.distanceToNextCheckpoint = Infinity;
        this.minDistanceToNextCheckpoint = Infinity;
        this.efficientDistance = 0;

        // Visited zones (for exploration)
        this.visitedZones = new Set();
        this.zoneSize = 50; // Zone size in pixels

        // Sensors (from Config)
        this.sensorCount = Config.network.sensorCount;
        this.sensorLength = Config.network.sensorRange;
        this.sensorAngles = this.generateSensorAngles(this.sensorCount);
        this.sensorReadings = new Array(this.sensorCount).fill(1);

        // Neural network
        const inputSize = this.sensorCount + 3; // sensors + speed + direction (x, y)
        const hiddenSize = Config.network.hiddenSize;
        const outputSize = 4; // accelerate, brake, left, right

        if (brain) {
            this.brain = brain;
        } else {
            this.brain = new NeuralNetwork(inputSize, hiddenSize, outputSize);
        }

        // Direction to next checkpoint
        this.checkpointDirX = 0;
        this.checkpointDirY = 0;

        // Additional scores
        this.novelty = 0;
        this.sharedFitness = 0;
        this.combinedScore = 0;

        // Color
        this.color = `hsl(${Math.random() * 360}, 70%, 50%)`;
        this.isBest = false;
    }

    /**
     * Generate uniformly distributed sensor angles
     */
    generateSensorAngles(count) {
        const angles = [];
        const spread = Math.PI; // 180 degrees coverage
        const step = spread / (count - 1);

        for (let i = 0; i < count; i++) {
            angles.push(-spread / 2 + i * step);
        }
        return angles;
    }

    /**
     * Reset car to starting position
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
        this.distanceToNextCheckpoint = Infinity;
        this.minDistanceToNextCheckpoint = Infinity;
        this.efficientDistance = 0;
        this.checkpointDirX = 0;
        this.checkpointDirY = 0;
        this.sensorReadings = new Array(this.sensorCount).fill(1);
        this.visitedZones.clear();
        this.novelty = 0;
        this.sharedFitness = 0;
        this.combinedScore = 0;
    }

    /**
     * Record visited zone (for exploration)
     */
    recordZone() {
        const zoneX = Math.floor(this.x / this.zoneSize);
        const zoneY = Math.floor(this.y / this.zoneSize);
        this.visitedZones.add(`${zoneX},${zoneY}`);
    }

    /**
     * Update sensors based on track walls
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
     * Calculate intersection between two line segments
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
     * Check if car collides with walls
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
     * Get car corners
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
     * Update direction to next checkpoint
     */
    updateCheckpointDirection(checkpoints) {
        if (checkpoints.length === 0) return;

        const cp = checkpoints[this.checkpointIndex % checkpoints.length];

        const dx = cp.midX - this.x;
        const dy = cp.midY - this.y;
        this.distanceToNextCheckpoint = Math.sqrt(dx * dx + dy * dy);

        const angleToCheckpoint = Math.atan2(dy, dx);
        const relativeAngle = angleToCheckpoint - this.angle;
        this.checkpointDirX = Math.cos(relativeAngle);
        this.checkpointDirY = Math.sin(relativeAngle);

        if (this.distanceToNextCheckpoint < this.minDistanceToNextCheckpoint) {
            this.minDistanceToNextCheckpoint = this.distanceToNextCheckpoint;
        }
    }

    /**
     * Check if car passed a checkpoint in the RIGHT DIRECTION
     */
    checkCheckpoints(checkpoints) {
        if (checkpoints.length === 0) return false;

        const totalCheckpoints = checkpoints.length;
        const cp = checkpoints[this.checkpointIndex % totalCheckpoints];
        const corners = this.getCorners();

        for (let i = 0; i < corners.length; i++) {
            const next = (i + 1) % corners.length;
            if (this.getLineIntersection(
                corners[i].x, corners[i].y,
                corners[next].x, corners[next].y,
                cp.x1, cp.y1, cp.x2, cp.y2
            )) {
                const carDirX = Math.cos(this.angle);
                const carDirY = Math.sin(this.angle);
                const dotProduct = carDirX * cp.dirX + carDirY * cp.dirY;

                if (dotProduct > 0.1) {
                    this.checkpointsPassed++;
                    this.stuckCounter = 0;
                    this.efficientDistance += this.lapDistance;

                    this.checkpointIndex++;
                    this.minDistanceToNextCheckpoint = Infinity;

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
     * Calculate car fitness (uses Config.fitness)
     */
    calculateFitness() {
        const f = Config.fitness;

        // Completed laps
        const lapScore = this.laps * f.lapBonus;

        // Passed checkpoints
        const checkpointScore = this.checkpointsPassed * f.checkpointWeight;

        // Progress towards next checkpoint
        let approachScore = 0;
        if (this.minDistanceToNextCheckpoint < Infinity && this.minDistanceToNextCheckpoint > 0) {
            approachScore = f.approachWeight / (1 + this.minDistanceToNextCheckpoint / 50);
        }

        // Direction bonus (facing checkpoint)
        const directionScore = Math.max(0, this.checkpointDirX) * 200;

        // Total distance
        const distanceScore = this.totalDistance * 0.3;

        // Average speed
        const speedScore = this.avgSpeed * f.speedWeight;

        // Exploration (unique zones visited)
        const explorationScore = this.visitedZones.size * f.explorationWeight;

        // Stuck penalty
        const stuckPenalty = this.stuckCounter * f.stuckPenalty;

        // Wrong way penalty (back to checkpoint)
        const wrongWayPenalty = this.checkpointDirX < -0.3 ? f.wrongWayPenalty * Math.abs(this.checkpointDirX) : 0;

        this.fitness = lapScore + checkpointScore + approachScore + directionScore +
            distanceScore + speedScore + explorationScore - stuckPenalty - wrongWayPenalty;

        return this.fitness;
    }

    /**
     * Update car (called every frame)
     */
    update(walls, checkpoints) {
        if (!this.alive) return;

        this.frameCount++;
        this.currentLapTime++;

        // Update physics from Config
        this.maxSpeed = Config.physics.maxSpeed;
        this.acceleration = Config.physics.acceleration;
        this.friction = Config.physics.friction;

        // Update sensors
        this.updateSensors(walls);

        // Update direction to checkpoint
        this.updateCheckpointDirection(checkpoints);

        // Get neural network decisions
        const normalizedSpeed = this.speed / this.maxSpeed;
        const inputs = [
            ...this.sensorReadings,
            normalizedSpeed,
            this.checkpointDirX,
            this.checkpointDirY
        ];
        const outputs = this.brain.predict(inputs);

        // Accelerate/Brake
        const throttle = outputs[0] - outputs[1];
        if (throttle > 0) {
            this.speed += this.acceleration * throttle;
        } else {
            this.speed += this.acceleration * throttle * 0.5;
        }

        // Initial impulse
        if (this.speed < 1 && this.frameCount < 60) {
            this.speed = 1;
        }

        // Turn with speed reduction
        const steering = outputs[3] - outputs[2];
        if (this.speed > 0.1) {
            const speedRatio = this.speed / this.maxSpeed;
            const steeringFactor = 1 - speedRatio * Config.physics.turnReduction;
            this.angle += this.turnSpeed * steering * 2 * steeringFactor;
        }

        // Friction
        this.speed *= (1 - this.friction);

        // Limit speed
        this.speed = Math.max(0, Math.min(this.maxSpeed, this.speed));

        // Speed stats
        if (this.speed > 0) {
            this.totalSpeed += this.speed;
            this.speedSamples++;
            this.avgSpeed = this.speedSamples > 0 ? this.totalSpeed / this.speedSamples : 0;
            if (this.speed > this.maxSpeedReached) {
                this.maxSpeedReached = this.speed;
            }
        }

        // Update position
        const prevX = this.x;
        const prevY = this.y;
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Distance traveled
        const dist = Math.sqrt(Math.pow(this.x - prevX, 2) + Math.pow(this.y - prevY, 2));
        this.totalDistance += dist;
        this.lapDistance += dist;

        // Record visited zone
        this.recordZone();

        // Distance from start
        const distFromStart = Math.sqrt(
            Math.pow(this.x - this.startX, 2) +
            Math.pow(this.y - this.startY, 2)
        );
        if (distFromStart > this.maxDistFromStart) {
            this.maxDistFromStart = distFromStart;
        }

        // Stuck detection
        if (this.frameCount % 30 === 0) {
            const movement = Math.sqrt(
                Math.pow(this.x - this.lastX, 2) +
                Math.pow(this.y - this.lastY, 2)
            );
            if (movement < 5) {
                this.stuckCounter++;
            } else {
                this.stuckCounter = Math.max(0, this.stuckCounter - 1);
            }
            this.lastX = this.x;
            this.lastY = this.y;
        }

        // Check checkpoints
        this.checkCheckpoints(checkpoints);

        // Calculate fitness
        this.calculateFitness();

        // Wall collision
        if (this.checkCollision(walls)) {
            this.alive = false;
        }

        // Stuck too long
        if (this.stuckCounter > 10) {
            this.alive = false;
        }

        // Lap finished
        if (this.finishedLap) {
            this.alive = false;
        }
    }

    /**
     * Draw car on canvas
     */
    draw(ctx, showSensors = false) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Car body
        if (this.alive) {
            ctx.fillStyle = this.isBest ? '#FFD700' : this.color;
            ctx.globalAlpha = this.isBest ? 1 : 0.6;
        } else {
            ctx.fillStyle = '#333';
            ctx.globalAlpha = 0.2;
        }

        // Car shape
        ctx.beginPath();
        ctx.moveTo(this.width / 2, 0);
        ctx.lineTo(this.width / 4, -this.height / 2);
        ctx.lineTo(-this.width / 2, -this.height / 2);
        ctx.lineTo(-this.width / 2, this.height / 2);
        ctx.lineTo(this.width / 4, this.height / 2);
        ctx.closePath();
        ctx.fill();

        // Front indicator
        if (this.alive) {
            ctx.fillStyle = '#fff';
            ctx.globalAlpha = 0.8;
            ctx.fillRect(this.width / 4, -this.height / 4, this.width / 5, this.height / 2);
        }

        ctx.restore();

        // Draw sensors
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
