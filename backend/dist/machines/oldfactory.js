"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const machine_1 = require("../machine");
class OldFactoryMachine extends machine_1.default {
    constructor() {
        super(...arguments);
        this.onStart = () => {
            this.log("started");
            this.status = "Factory";
            // run every 5 seconds
            this.intervals.push(setInterval(() => {
                this.sendUpdates();
            }, 5000));
        };
    }
}
exports.default = OldFactoryMachine;
