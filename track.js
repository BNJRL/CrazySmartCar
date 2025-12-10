/**
 * Circuit de Spa-Francorchamps (Belgique) - Version praticable pour l'IA
 */
class Track {
    constructor() {
        this.walls = [];
        this.checkpoints = [];
        this.outerPoints = [];
        this.innerPoints = [];
        this.startX = 150;
        this.startY = 400;
        this.startAngle = 0;

        this.createTrack();
    }

    /**
     * Crée le circuit de Spa-Francorchamps
     */
    createTrack() {
        const trackWidth = 70; // Largeur de piste plus large

        // Ligne centrale du circuit (forme de Spa simplifiée)
        const centerLine = [
            // Départ / Ligne droite principale
            { x: 100, y: 400 },
            { x: 200, y: 400 },

            // La Source (épingle droite)
            { x: 270, y: 390 },
            { x: 300, y: 360 },
            { x: 290, y: 320 },
            { x: 250, y: 300 },

            // Descente vers Eau Rouge
            { x: 280, y: 260 },
            { x: 320, y: 210 },

            // Eau Rouge - Raidillon (montée en S)
            { x: 370, y: 160 },
            { x: 430, y: 120 },
            { x: 500, y: 95 },

            // Kemmel (ligne droite)
            { x: 600, y: 85 },
            { x: 700, y: 90 },

            // Les Combes (chicane)
            { x: 770, y: 110 },
            { x: 810, y: 150 },
            { x: 800, y: 200 },

            // Malmedy - Rivage
            { x: 760, y: 250 },
            { x: 780, y: 300 },
            { x: 830, y: 330 },

            // Pouhon
            { x: 900, y: 310 },
            { x: 960, y: 320 },

            // Fagnes - Stavelot
            { x: 1020, y: 360 },
            { x: 1040, y: 420 },
            { x: 1010, y: 480 },
            { x: 950, y: 510 },

            // Blanchimont (grande courbe rapide)
            { x: 850, y: 530 },
            { x: 750, y: 560 },
            { x: 620, y: 580 },
            { x: 500, y: 580 },

            // Bus Stop (chicane)
            { x: 400, y: 560 },
            { x: 300, y: 520 },
            { x: 220, y: 500 },
            { x: 160, y: 470 },
            { x: 100, y: 440 }
        ];

        // Générer les points extérieurs et intérieurs à partir de la ligne centrale
        this.outerPoints = [];
        this.innerPoints = [];

        for (let i = 0; i < centerLine.length; i++) {
            const prev = centerLine[(i - 1 + centerLine.length) % centerLine.length];
            const curr = centerLine[i];
            const next = centerLine[(i + 1) % centerLine.length];

            // Direction moyenne (tangente)
            const dx = next.x - prev.x;
            const dy = next.y - prev.y;
            const len = Math.sqrt(dx * dx + dy * dy);

            // Normale (perpendiculaire)
            const nx = -dy / len;
            const ny = dx / len;

            // Points extérieur et intérieur
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

        // Créer les murs extérieurs (boucle fermée)
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

        // Créer les murs intérieurs (boucle fermée)
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

        // Créer 10 checkpoints répartis sur le circuit
        const numCheckpoints = 10;
        const step = Math.floor(this.outerPoints.length / numCheckpoints);

        for (let i = 0; i < numCheckpoints; i++) {
            const idx = i * step;
            const nextIdx = ((i + 1) * step) % this.outerPoints.length;

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
                index: i,
                dirX: len > 0 ? dirX / len : 1,
                dirY: len > 0 ? dirY / len : 0
            });
        }

        // Position de départ
        this.startX = 130;
        this.startY = 400;
        this.startAngle = 0;

        this.totalCheckpoints = this.checkpoints.length;
    }

    /**
     * Dessine le circuit
     */
    draw(ctx) {
        ctx.save();

        // Fond de piste
        ctx.fillStyle = '#3a3a5a';
        ctx.beginPath();
        ctx.moveTo(this.outerPoints[0].x, this.outerPoints[0].y);
        for (let i = 1; i < this.outerPoints.length; i++) {
            ctx.lineTo(this.outerPoints[i].x, this.outerPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Trou central (herbe)
        ctx.fillStyle = '#1a2e1a';
        ctx.beginPath();
        ctx.moveTo(this.innerPoints[0].x, this.innerPoints[0].y);
        for (let i = 1; i < this.innerPoints.length; i++) {
            ctx.lineTo(this.innerPoints[i].x, this.innerPoints[i].y);
        }
        ctx.closePath();
        ctx.fill();

        // Ligne centrale pointillée
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 2;
        ctx.setLineDash([15, 15]);
        ctx.beginPath();
        for (let i = 0; i < this.outerPoints.length; i++) {
            const midX = (this.outerPoints[i].x + this.innerPoints[i].x) / 2;
            const midY = (this.outerPoints[i].y + this.innerPoints[i].y) / 2;
            if (i === 0) {
                ctx.moveTo(midX, midY);
            } else {
                ctx.lineTo(midX, midY);
            }
        }
        ctx.closePath();
        ctx.stroke();
        ctx.setLineDash([]);

        // Murs extérieurs
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

        // Murs intérieurs
        ctx.beginPath();
        ctx.moveTo(this.innerPoints[0].x, this.innerPoints[0].y);
        for (let i = 1; i < this.innerPoints.length; i++) {
            ctx.lineTo(this.innerPoints[i].x, this.innerPoints[i].y);
        }
        ctx.closePath();
        ctx.stroke();

        // Checkpoints visibles avec numéros
        for (let i = 0; i < this.checkpoints.length; i++) {
            const cp = this.checkpoints[i];

            // Ligne du checkpoint
            if (i === 0) {
                ctx.strokeStyle = '#4ecca3'; // Vert pour le départ
                ctx.lineWidth = 5;
            } else {
                ctx.strokeStyle = 'rgba(255, 200, 50, 0.6)'; // Jaune pour les autres
                ctx.lineWidth = 3;
            }

            ctx.beginPath();
            ctx.moveTo(cp.x1, cp.y1);
            ctx.lineTo(cp.x2, cp.y2);
            ctx.stroke();

            // Numéro du checkpoint
            const midX = (cp.x1 + cp.x2) / 2;
            const midY = (cp.y1 + cp.y2) / 2;

            ctx.fillStyle = i === 0 ? '#4ecca3' : '#ffc832';
            ctx.font = 'bold 14px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Cercle de fond
            ctx.beginPath();
            ctx.arc(midX, midY, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fill();

            // Numéro
            ctx.fillStyle = i === 0 ? '#4ecca3' : '#ffc832';
            ctx.fillText(i === 0 ? 'S' : i.toString(), midX, midY);
        }

        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';

        // Flèche direction
        ctx.fillStyle = '#4ecca3';
        ctx.beginPath();
        ctx.moveTo(180, 400);
        ctx.lineTo(165, 390);
        ctx.lineTo(165, 410);
        ctx.closePath();
        ctx.fill();

        // Noms des virages
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.font = '11px Arial';
        ctx.fillText('La Source', 300, 290);
        ctx.fillText('Eau Rouge', 340, 145);
        ctx.fillText('Raidillon', 460, 80);
        ctx.fillText('Kemmel', 630, 70);
        ctx.fillText('Les Combes', 820, 140);
        ctx.fillText('Rivage', 850, 320);
        ctx.fillText('Pouhon', 920, 290);
        ctx.fillText('Stavelot', 1030, 450);
        ctx.fillText('Blanchimont', 720, 590);
        ctx.fillText('Bus Stop', 230, 540);

        // Titre
        ctx.fillStyle = 'rgba(255, 215, 0, 0.7)';
        ctx.font = 'bold 16px Arial';
        ctx.fillText('SPA-FRANCORCHAMPS', 520, 350);
        ctx.font = '11px Arial';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillText('Belgique', 580, 368);

        ctx.restore();
    }
}
