/**
 * Réseau de neurones simple pour contrôler les voitures
 * Architecture: entrées -> couche cachée -> sorties
 */
class NeuralNetwork {
    constructor(inputSize, hiddenSize, outputSize) {
        this.inputSize = inputSize;
        this.hiddenSize = hiddenSize;
        this.outputSize = outputSize;

        // Initialisation des poids avec des valeurs aléatoires entre -1 et 1
        this.weightsInputHidden = this.createMatrix(hiddenSize, inputSize);
        this.weightsHiddenOutput = this.createMatrix(outputSize, hiddenSize);

        // Biais
        this.biasHidden = this.createArray(hiddenSize);
        this.biasOutput = this.createArray(outputSize);

        this.randomize();
    }

    /**
     * Crée une matrice de dimensions rows x cols
     */
    createMatrix(rows, cols) {
        const matrix = [];
        for (let i = 0; i < rows; i++) {
            matrix[i] = new Array(cols).fill(0);
        }
        return matrix;
    }

    /**
     * Crée un tableau de taille donnée
     */
    createArray(size) {
        return new Array(size).fill(0);
    }

    /**
     * Initialise les poids et biais avec des valeurs aléatoires
     */
    randomize() {
        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.inputSize; j++) {
                this.weightsInputHidden[i][j] = Math.random() * 2 - 1;
            }
            this.biasHidden[i] = Math.random() * 2 - 1;
        }

        for (let i = 0; i < this.outputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                this.weightsHiddenOutput[i][j] = Math.random() * 2 - 1;
            }
            this.biasOutput[i] = Math.random() * 2 - 1;
        }
    }

    /**
     * Fonction d'activation: tanh (retourne une valeur entre -1 et 1)
     */
    activate(x) {
        return Math.tanh(x);
    }

    /**
     * Propagation avant: calcule les sorties à partir des entrées
     */
    predict(inputs) {
        // Couche cachée
        const hidden = [];
        for (let i = 0; i < this.hiddenSize; i++) {
            let sum = this.biasHidden[i];
            for (let j = 0; j < this.inputSize; j++) {
                sum += inputs[j] * this.weightsInputHidden[i][j];
            }
            hidden[i] = this.activate(sum);
        }

        // Couche de sortie
        const outputs = [];
        for (let i = 0; i < this.outputSize; i++) {
            let sum = this.biasOutput[i];
            for (let j = 0; j < this.hiddenSize; j++) {
                sum += hidden[j] * this.weightsHiddenOutput[i][j];
            }
            outputs[i] = this.activate(sum);
        }

        return outputs;
    }

    /**
     * Crée une copie du réseau de neurones
     */
    clone() {
        const clone = new NeuralNetwork(this.inputSize, this.hiddenSize, this.outputSize);

        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.inputSize; j++) {
                clone.weightsInputHidden[i][j] = this.weightsInputHidden[i][j];
            }
            clone.biasHidden[i] = this.biasHidden[i];
        }

        for (let i = 0; i < this.outputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                clone.weightsHiddenOutput[i][j] = this.weightsHiddenOutput[i][j];
            }
            clone.biasOutput[i] = this.biasOutput[i];
        }

        return clone;
    }

    /**
     * Applique une mutation aléatoire aux poids du réseau
     * @param {number} rate - Probabilité de mutation (0 à 1)
     */
    mutate(rate) {
        const mutateValue = (value) => {
            if (Math.random() < rate) {
                // Mutation gaussienne
                return value + (Math.random() * 2 - 1) * 0.5;
            }
            return value;
        };

        for (let i = 0; i < this.hiddenSize; i++) {
            for (let j = 0; j < this.inputSize; j++) {
                this.weightsInputHidden[i][j] = mutateValue(this.weightsInputHidden[i][j]);
            }
            this.biasHidden[i] = mutateValue(this.biasHidden[i]);
        }

        for (let i = 0; i < this.outputSize; i++) {
            for (let j = 0; j < this.hiddenSize; j++) {
                this.weightsHiddenOutput[i][j] = mutateValue(this.weightsHiddenOutput[i][j]);
            }
            this.biasOutput[i] = mutateValue(this.biasOutput[i]);
        }
    }

    /**
     * Croisement entre deux réseaux de neurones
     */
    static crossover(parent1, parent2) {
        const child = new NeuralNetwork(parent1.inputSize, parent1.hiddenSize, parent1.outputSize);

        for (let i = 0; i < parent1.hiddenSize; i++) {
            for (let j = 0; j < parent1.inputSize; j++) {
                child.weightsInputHidden[i][j] = Math.random() < 0.5
                    ? parent1.weightsInputHidden[i][j]
                    : parent2.weightsInputHidden[i][j];
            }
            child.biasHidden[i] = Math.random() < 0.5
                ? parent1.biasHidden[i]
                : parent2.biasHidden[i];
        }

        for (let i = 0; i < parent1.outputSize; i++) {
            for (let j = 0; j < parent1.hiddenSize; j++) {
                child.weightsHiddenOutput[i][j] = Math.random() < 0.5
                    ? parent1.weightsHiddenOutput[i][j]
                    : parent2.weightsHiddenOutput[i][j];
            }
            child.biasOutput[i] = Math.random() < 0.5
                ? parent1.biasOutput[i]
                : parent2.biasOutput[i];
        }

        return child;
    }

    /**
     * Exporte le réseau en JSON
     */
    toJSON() {
        return {
            inputSize: this.inputSize,
            hiddenSize: this.hiddenSize,
            outputSize: this.outputSize,
            weightsInputHidden: this.weightsInputHidden,
            weightsHiddenOutput: this.weightsHiddenOutput,
            biasHidden: this.biasHidden,
            biasOutput: this.biasOutput
        };
    }

    /**
     * Crée un réseau à partir de données JSON
     */
    static fromJSON(data) {
        const nn = new NeuralNetwork(data.inputSize, data.hiddenSize, data.outputSize);
        nn.weightsInputHidden = data.weightsInputHidden;
        nn.weightsHiddenOutput = data.weightsHiddenOutput;
        nn.biasHidden = data.biasHidden;
        nn.biasOutput = data.biasOutput;
        return nn;
    }
}
