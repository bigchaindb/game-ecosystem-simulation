"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const machine_1 = require("../machine");
class CommunityMachine extends machine_1.default {
    constructor() {
        super(...arguments);
        this.onStart = () => {
            this.log("started");
            /*
            // consume energy every 60 seconds
            setInterval(()=>{
              if (this.has["Energy"]>0) {
                this.consumeAssets("Energy",1)
              } else {
                this.custom["happy"] -= 1
              }
            }, 60000);
            */
        };
    }
}
exports.default = CommunityMachine;
