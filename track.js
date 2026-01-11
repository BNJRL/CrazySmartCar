/**
 * Custom track drawn by the user
 */
class Track {
    constructor(customPoints = null, startX = null, startY = null, startAngle = null) {
        this.walls = [];
        this.checkpoints = [];
        this.outerPoints = [];
        this.innerPoints = [];

        // Default start position
        this.startX = startX !== null ? startX : 200;
        this.startY = startY !== null ? startY : 340;
        this.startAngle = startAngle !== null ? startAngle : 0;

        if (customPoints && customPoints.length > 0) {
            this.createTrackFromPoints(customPoints);
        }

        this.totalCheckpoints = this.checkpoints.length;
    }

    draw(ctx) {
        // Draw nothing if no track
        if (this.outerPoints.length === 0) return;
        ctx.save();

        // Track background
        ctx.fillStyle = '#3a3a5a';
        ctx.beginPath();
        ctx.moveTo(this.outerPoints[0].x, this.outerPoints[0].y);
        for (let i = 1; i < this.outerPoints.length; i++) {
            ctx.lineTo(this.outerPoints[i].x, this.outerPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Inner hole (grass)
        ctx.fillStyle = '#1a2e1a';
        ctx.beginPath();
        ctx.moveTo(this.innerPoints[0].x, this.innerPoints[0].y);
        for (let i = 1; i < this.innerPoints.length; i++) {
            ctx.lineTo(this.innerPoints[i].x, this.innerPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Dashed center line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        for (let i = 0; i < this.outerPoints.length; i++) {
            const midX = (this.outerPoints[i].x + this.innerPoints[i].x) / 2;
            const midY = (this.outerPoints[i].y + this.innerPoints[i].y) / 2;
            if (i === 0) ctx.moveTo(midX, midY);
            else ctx.lineTo(midX, midY);
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Outer walls (red)
        ctx.strokeStyle = '#ff4444';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.beginPath();
        ctx.moveTo(this.outerPoints[0].x, this.outerPoints[0].y);
        for (let i = 1; i < this.outerPoints.length; i++) {
            ctx.lineTo(this.outerPoints[i].x, this.outerPoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Inner walls (red)
        ctx.beginPath();
        ctx.moveTo(this.innerPoints[0].x, this.innerPoints[0].y);
        for (let i = 1; i < this.innerPoints.length; i++) {
            ctx.lineTo(this.innerPoints[i].x, this.innerPoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Checkpoints (simplified display to avoid clutter)
        for (let i = 0; i < this.checkpoints.length; i++) {
            const cp = this.checkpoints[i];

            // Start line in magenta, other checkpoints discrete
            if (i === 0) {
                ctx.strokeStyle = '#ff00ff';
                ctx.lineWidth = 5;
            } else {
                ctx.strokeStyle = 'rgba(255, 200, 50, 0.3)';
                ctx.lineWidth = 1;
            }

            ctx.beginPath();
            ctx.moveTo(cp.x1, cp.y1);
            ctx.lineTo(cp.x2, cp.y2);
            ctx.stroke();

            // Number only for start and every 10 checkpoints
            if (i === 0 || i % 10 === 0) {
                const midX = cp.midX;
                const midY = cp.midY;

                ctx.beginPath();
                ctx.arc(midX, midY, 10, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                ctx.fill();

                ctx.fillStyle = i === 0 ? '#ff00ff' : '#ffc832';
                ctx.font = 'bold 9px Arial';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(i === 0 ? 'S' : i.toString(), midX, midY);
            }
        }

        // Direction arrow at start
        const startDirX = Math.cos(this.startAngle);
        const startDirY = Math.sin(this.startAngle);
        const arrowX = this.startX + startDirX * 30;
        const arrowY = this.startY + startDirY * 30;

        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.moveTo(arrowX, arrowY);
        ctx.lineTo(arrowX - startDirX * 15 - startDirY * 8, arrowY - startDirY * 15 + startDirX * 8);
        ctx.lineTo(arrowX - startDirX * 15 + startDirY * 8, arrowY - startDirY * 15 - startDirX * 8);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
    }

    /**
     * Create track from user-drawn points
     * @param {Array} points - List of {x, y} for center line
     */
    createTrackFromPoints(points) {
        // Use width from Config (with fallback)
        const trackWidth = (typeof Config !== 'undefined' && Config.track) ? Config.track.width : 55;

        // Use provided points as center line
        const centerLine = points;

        // Generate outer and inner points
        this.outerPoints = [];
        this.innerPoints = [];

        for (let i = 0; i < centerLine.length; i++) {
            const prev = centerLine[(i - 1 + centerLine.length) % centerLine.length];
            const curr = centerLine[i];
            const next = centerLine[(i + 1) % centerLine.length];

            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            if (len < 0.001) continue;

            const nx = -dy / len;
            const ny = dx / len;

            const halfWidth = trackWidth / 2;
            this.outerPoints.push({
                x: curr.x + nx * halfWidth,
                y: curr.y + ny * halfWidth
            });
            this.innerPoints.push({
                x: curr.x - nx * halfWidth,
                y: curr.y - ny * halfWidth
            });
        }

        // Create walls
        this.walls = [];
        for (let i = 0; i < this.outerPoints.length; i++) {
            const next = (i + 1) % this.outerPoints.length;
            this.walls.push({
                x1: this.outerPoints[i].x,
                y1: this.outerPoints[i].y,
                x2: this.outerPoints[next].x,
                y2: this.outerPoints[next].y,
                isOuter: true
            });
        }

        for (let i = 0; i < this.innerPoints.length; i++) {
            const next = (i + 1) % this.innerPoints.length;
            this.walls.push({
                x1: this.innerPoints[i].x,
                y1: this.innerPoints[i].y,
                x2: this.innerPoints[next].x,
                y2: this.innerPoints[next].y,
                isOuter: false
            });
        }

        // Create checkpoints based on direction changes
        this.checkpoints = [];
        const checkpointDensity = (typeof Config !== 'undefined' && Config.track)
            ? Config.track.checkpointDensity : 15;
        const minAngleChange = checkpointDensity * Math.PI / 180; // Convert to radians

        // Calculate direction angles for each point
        const angles = [];
        for (let i = 0; i < this.outerPoints.length; i++) {
            const prev = (i - 1 + this.outerPoints.length) % this.outerPoints.length;
            const next = (i + 1) % this.outerPoints.length;

            const midX = (this.outerPoints[i].x + this.innerPoints[i].x) / 2;
            const midY = (this.outerPoints[i].y + this.innerPoints[i].y) / 2;
            const prevMidX = (this.outerPoints[prev].x + this.innerPoints[prev].x) / 2;
            const prevMidY = (this.outerPoints[prev].y + this.innerPoints[prev].y) / 2;
            const nextMidX = (this.outerPoints[next].x + this.innerPoints[next].x) / 2;
            const nextMidY = (this.outerPoints[next].y + this.innerPoints[next].y) / 2;

            const angle = Math.atan2(nextMidY - prevMidY, nextMidX - prevMidX);
            angles.push(angle);
        }

        // Always add first point as checkpoint (start)
        let lastCheckpointIndex = 0;
        this.addCheckpoint(0);

        // Traverse and detect turns
        let accumulatedAngle = 0;
        for (let i = 1; i < this.outerPoints.length; i++) {
            // Calculate angle change from last point
            let angleDiff = angles[i] - angles[i - 1];

            // Normalize angle between -PI and PI
            while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

            accumulatedAngle += Math.abs(angleDiff);

            // Distance from last checkpoint
            const distFromLast = i - lastCheckpointIndex;

            // Add checkpoint if:
            // 1. Accumulated angle exceeds threshold (turn detected)
            // 2. Or if too much distance without checkpoint (straight line)
            const maxDistWithoutCheckpoint = Math.max(5, Math.floor(this.outerPoints.length / 20));

            if (accumulatedAngle >= minAngleChange || distFromLast >= maxDistWithoutCheckpoint) {
                this.addCheckpoint(i);
                lastCheckpointIndex = i;
                accumulatedAngle = 0;
            }
        }

        // Start position: first point if not specified
        if (this.startX === 200 && this.startY === 340) {
            this.startX = centerLine[0].x;
            this.startY = centerLine[0].y;
            if (centerLine.length > 1) {
                const dx = centerLine[1].x - centerLine[0].x;
                const dy = centerLine[1].y - centerLine[0].y;
                this.startAngle = Math.atan2(dy, dx);
            } else {
                this.startAngle = 0;
            }
        }

        this.totalCheckpoints = this.checkpoints.length;
        console.log(`Track created: ${this.checkpoints.length} checkpoints, width ${trackWidth}px`);
    }

    /**
     * Add checkpoint at given index
     */
    addCheckpoint(idx) {
        const nextIdx = (idx + 1) % this.outerPoints.length;

        const midX = (this.outerPoints[idx].x + this.innerPoints[idx].x) / 2;
        const midY = (this.outerPoints[idx].y + this.innerPoints[idx].y) / 2;
        const nextMidX = (this.outerPoints[nextIdx].x + this.innerPoints[nextIdx].x) / 2;
        const nextMidY = (this.outerPoints[nextIdx].y + this.innerPoints[nextIdx].y) / 2;

        const dirX = nextMidX - midX;
        const dirY = nextMidY - midY;
        const len = Math.sqrt(dirX * dirX + dirY * dirY);

        this.checkpoints.push({
            x1: this.outerPoints[idx].x,
            y1: this.outerPoints[idx].y,
            x2: this.innerPoints[idx].x,
            y2: this.innerPoints[idx].y,
            index: this.checkpoints.length,
            midX: midX,
            midY: midY,
            dirX: len > 0 ? dirX / len : 1,
            dirY: len > 0 ? dirY / len : 0
        });
    }

    /**
     * Set start position
     */
    setStart(x, y, angle = null) {
        this.startX = x;
        this.startY = y;
        if (angle !== null) {
            this.startAngle = angle;
        }
    }
}
