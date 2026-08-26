export class Randomiser {

    random() {
        return Math.random();
    }

    // Generate a random integer between min and max inclusive
    randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    // Pick a random element from an array
    randomChoice(array) {
        return array[this.randomInt(0, array.length - 1)];
    }

    // Return true with given probability (0–1)
    chance(prob) {
        return Math.random() < prob;
    }
}
