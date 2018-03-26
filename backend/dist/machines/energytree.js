"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const machine_1 = require("../machine");
class EnergyTreeMachine extends machine_1.default {
    constructor() {
        super(...arguments);
        this.onStart = () => {
            this.log("started");
            this.status = "NeedsPrinting";
            // run every 5 seconds
            this.intervals.push(setInterval(() => {
                // w8 to be printed or repaired
                if (this.status === "NeedsPrinting") {
                    // check if printing car is here
                    if (this.isPrintingCarHere() === true) {
                        this.status = "Ready";
                    }
                }
                else {
                    // offer everything we have
                    this.offers = this.has;
                    this.status = "Offering";
                    // don't produce more if we have enough
                    if (!("Energy" in this.has) || this.has["Energy"] < 5) {
                        this.produceAssets("Energy", 1);
                    }
                    // get machines that await transfer
                    let machines = this.getMachinesAtDeliveryThatNeeds("Energy");
                    this.log("machine at delivery that needs energy", machines);
                    for (let i in machines) {
                        // transfer energy
                        this.transferAssets("Energy", machines[i].amount, this.machines[machines[i].id].state.publicKey);
                    }
                }
                this.sendUpdates();
            }, 5000));
        };
    }
}
exports.default = EnergyTreeMachine;
