"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const machine_1 = require("../machine");
class HouseMachine extends machine_1.default {
    constructor() {
        super(...arguments);
        this.onStart = () => {
            this.log("started");
            this.status = "House";
            this.custom["happiness"] = 2;
            // run every 5 seconds
            this.intervals.push(setInterval(() => {
                if ("Energy" in this.has && this.has["Energy"] < 2) {
                    this.needs["Energy"] = 2 - this.has["Energy"];
                }
                else {
                    this.needs["Energy"] = 2;
                }
                this.sendUpdates();
            }, 5000));
            // run every 5 minutes
            this.intervals.push(setInterval(() => {
                // consume energy
                if ("Energy" in this.has && this.has["Energy"] > 0) {
                    this.consumeAssets("Energy", this.has["Energy"]);
                    this.custom["happiness"] = 2;
                }
                else {
                    // reduce happiness if factory not there
                    if (this.isOldFactoryClosed() === true) {
                        if (this.custom["happiness"] > 0) {
                            this.custom["happiness"] -= 1;
                        }
                    }
                }
            }, 300000));
        };
    }
}
exports.default = HouseMachine;
