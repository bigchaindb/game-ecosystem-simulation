"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const machine_1 = require("../machine");
class TransportMachine extends machine_1.default {
    constructor() {
        super(...arguments);
        this.onStart = () => {
            this.log("started");
            this.status = "NeedsPrinting";
            // main processing loop
            this.intervals.push(setInterval(() => {
                // random broken
                if (this.getRandomInt(100) === 0) {
                    this.status = "NeedsRepair";
                }
                // w8 to be printed or repaired
                if (this.status === "NeedsPrinting" || this.status === "NeedsRepair") {
                    // check if printing car is here
                    if (this.isPrintingCarHere() === true) {
                        this.status = "Ready";
                    }
                }
                else {
                    // am I transporting already?
                    if (this.has["Energy"] > 0) {
                        // find target
                        let machines = this.getNearestNeeds("Energy", 50);
                        // Am I there yet
                        if (machines.length > 0) {
                            if (machines[0].distance === 0) {
                                // transfer energy
                                this.transferAssets("Energy", 1, this.machines[machines[0].id].state.publicKey);
                            }
                            else {
                                // move there
                                this.status = "Moving";
                                this.moveTowards(machines[0].id);
                            }
                        }
                        else {
                            this.log("no needs machines");
                        }
                    }
                    else {
                        // find target
                        let machines = this.getNearestOffering("Energy", 50);
                        // Am I there yet
                        if (machines.length > 0) {
                            if (machines[0].distance === 0) {
                                // I'm here accepting
                                this.status = "Accepting";
                                this.needs["Energy"] = 1;
                            }
                            else {
                                // move there
                                this.status = "Moving";
                                delete this.needs["Energy"];
                                this.moveTowards(machines[0].id);
                            }
                        }
                        else {
                            this.log("no offering machines");
                        }
                    }
                }
                /*
                // get machines with distance from loc with type
                let machines = this.getMachinesOfferingAtDistance("Energy",50)
                this.status = "Accepting"
                */
                this.sendUpdates();
            }, 5000));
        };
    }
}
exports.default = TransportMachine;
