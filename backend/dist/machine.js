"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const WebSocket = require("ws");
const Iota = require("./iota");
const Bdb = require("./bdb");
const debug = require("debug");
const pathfinding = require("pathfinding");
const uuidV4 = require("uuid/v4");
// config
const config = require('./config');
class Machine {
    constructor(job) {
        this.gridOffset = 50;
        this.pathFinder = new pathfinding.BiBestFirstFinder({
            allowDiagonal: false,
            dontCrossCorners: true,
            heuristic: pathfinding.Heuristic.chebyshev
        });
        this.intervals = [];
        // living properties
        this.machines = {};
        this.has = {};
        this.needs = {};
        this.offers = {};
        this.custom = {};
        this.load = () => {
            this.loc = this.machine.data.loc;
            this.keypair = Bdb.getKeypairFromSeed(this.machine.id);
            if (config.updatesOverIota) {
                this.iotaSeed = Iota.makeSeed();
                Iota.getAddressFromSeed(this.iotaSeed).then((address) => {
                    this.iotaAddress = address;
                });
            }
            let tx = Bdb.getTransaction(config.worldId).then((world) => {
                this.wordGrid = world.asset.data.grid;
                this.pathGrid = new pathfinding.Grid(this.wordGrid);
                this.init();
            });
            return new Promise((resolve) => {
                this.shutdownMe = resolve;
            });
        };
        this.onStart = () => {
            // this is overwritten
        };
        this.moveTowards = (machineId) => {
            let location;
            if (this.machines[machineId].machine === undefined) {
                return;
            }
            if (this.machines[machineId].machine.type === "TransportMachine") {
                location = this.machines[machineId].state.loc;
            }
            if (this.machines[machineId].machine.type === "EnergyTreeMachine") {
                location = this.machines[machineId].machine.data.del;
            }
            if (location === undefined) {
                return;
            }
            this.log("moving to:", location, "currently:", this.loc);
            let workingGrid = this.pathGrid.clone();
            let path = this.pathFinder.findPath(this.loc.x + this.gridOffset, this.loc.z + this.gridOffset, location.x + this.gridOffset, location.z + this.gridOffset, workingGrid);
            this.loc.x = path[1][0] - this.gridOffset;
            this.loc.z = path[1][1] - this.gridOffset;
        };
        this.distanceBetween = (loc1, loc2) => {
            if (loc1.x === loc2.x && loc1.z === loc2.z) {
                return 0;
            }
            let workingGrid = this.pathGrid.clone();
            let path = this.pathFinder.findPath(loc1.x + this.gridOffset, loc1.z + this.gridOffset, loc2.x + this.gridOffset, loc2.z + this.gridOffset, workingGrid);
            return path.length;
        };
        this.shutdown = () => {
            this.log("shutdown");
            this.ws.terminate();
            for (let interval of this.intervals) {
                clearInterval(interval);
            }
            this.shutdownMe(this);
        };
        this.sendUpdates = () => {
            let asset = { id: 'Update:' + this.machine.bdbId + ':' + Date.now() };
            let metadata = {
                loc: this.loc,
                status: this.status,
                has: this.has,
                needs: this.needs,
                offers: this.offers,
                custom: this.custom
            };
            if (config.updatesOverIota) {
                Iota.sendTransaction(this.iotaSeed, config.udpatesIotaAddress, { asset: asset, metadata: metadata });
            }
            else {
                Bdb.createNewAssetWithOwnerNoPoll(this.keypair, config.updatesIdentity.publicKey, asset, metadata);
            }
        };
        this.modifyAssets = (type, change) => {
            if (!(type in this.has)) {
                this.has[type] = 0;
            }
            else {
                if ((this.has[type] + change) === 0) {
                    delete this.has[type];
                    return;
                }
            }
            this.has[type] += change;
        };
        this.produceAssets = (type, amount) => {
            this.log('producing asset: ' + type);
            for (let i = 0; i < amount; i++) {
                let asset = {
                    id: 'Asset:' + type + ':' + uuidV4(),
                    type: type,
                    time: Date.now()
                };
                let metadata = null;
                Bdb.createNewAssetNoPoll(this.keypair, asset, metadata);
            }
        };
        this.consumeAssets = (type, amount) => {
            this.log('consuming asset:', type, 'amount:', amount);
            Bdb.transferAssets(this.keypair, type, amount, config.consumedIdentity.publicKey);
        };
        this.transferAssets = (type, amount, toPublicKey) => {
            this.log('transfering asset:', type, 'amount:', amount);
            Bdb.transferAssets(this.keypair, type, amount, toPublicKey);
        };
        this.getMachinesAtDeliveryThatNeeds = (type) => {
            let machines = [];
            for (let id in this.machines) {
                // do we have updates
                if (this.machines[id].state !== undefined) {
                    if (this.machines[id].state.loc.x === this.machine.data.del.x &&
                        this.machines[id].state.loc.z === this.machine.data.del.z &&
                        this.machines[id].state.needs[type] !== undefined &&
                        this.machines[id].state.status === "Accepting") {
                        machines.push({ id: id, amount: this.machines[id].state.needs[type] });
                    }
                }
            }
            return machines;
        };
        this.getScore = () => {
            let score = 0;
            for (let id in this.machines) {
                if (this.machines[id].state !== undefined &&
                    this.machines[id].state.custom.happiness !== undefined) {
                    score += this.machines[id].state.custom.happiness;
                }
            }
            return score;
        };
        this.getNearestOffering = (type, maxDistance) => {
            let machines = [];
            for (let id in this.machines) {
                let distance = this.distanceBetween(this.machine.data.loc, this.machines[id].machine.data.del);
                if (this.machines[id].state !== undefined &&
                    this.machines[id].state.offers[type] !== undefined &&
                    this.machines[id].state.status === "Offering" &&
                    distance <= maxDistance) {
                    machines.push({ id: id, distance: distance });
                }
            }
            machines.sort(this.distanceSorter);
            return machines;
        };
        this.getRandomInt = (max) => {
            return Math.floor(Math.random() * Math.floor(max));
        };
        this.isPrintingCarHere = () => {
            let machines = [];
            for (let id in this.machines) {
                if (this.machines[id].state !== undefined &&
                    this.machines[id].state.status === "Printing") {
                    let distance = this.distanceBetween(this.loc, this.machines[id].state.loc);
                    if (distance === 0) {
                        return true;
                    }
                }
            }
            return false;
        };
        this.getNearestNeedsPrinter = (maxDistance) => {
            let machines = [];
            for (let id in this.machines) {
                if (this.machines[id].state !== undefined &&
                    (this.machines[id].state.status === "NeedsPrinting" ||
                        this.machines[id].state.status === "NeedsRepair")) {
                    let distance = this.distanceBetween(this.machine.data.loc, this.machines[id].state.loc);
                    if (distance < maxDistance) {
                        machines.push({ id: id, distance: distance });
                    }
                }
            }
            machines.sort(this.distanceSorter);
            return machines;
        };
        this.isOldFactoryClosed = () => {
            for (let id in this.machines) {
                if (this.machines[id].type === "OldFactoryMachine" &&
                    this.machines[id].state.status === "closed") {
                    return true;
                }
            }
            return false;
        };
        this.checkGameover = () => {
            for (let id in this.machines) {
                if (this.machines[id].type === "HouseMachine" &&
                    this.machines[id].state !== undefined &&
                    this.machines[id].state.happiness !== undefined &&
                    this.machines[id].state.happiness === 0) {
                    return true;
                }
            }
            return false;
        };
        this.getNearestNeeds = (type, maxDistance) => {
            let machines = [];
            for (let id in this.machines) {
                let distance = this.distanceBetween(this.machine.data.loc, this.machines[id].machine.data.del);
                if (this.machines[id].state !== undefined &&
                    this.machines[id].state.needs[type] !== undefined &&
                    distance <= maxDistance) {
                    machines.push({ id: id, distance: distance });
                }
            }
            machines.sort(this.distanceSorter);
            return machines;
        };
        this.distanceSorter = (a, b) => {
            if (a.distance < b.distance)
                return -1;
            if (a.distance > b.distance)
                return 1;
            return 0;
        };
        this.init = () => {
            /*
            this.intervals.push(setInterval(()=>{
              Iota.findTransactionObjects({}).then((array)=>{
        
              })
            }, 5000));
            */
            let ws_url = 'ws://' + config.hostBigchainDB + ':9985/api/v1/streams/valid_transactions';
            this.ws = new WebSocket(ws_url, { origin: 'http://localhost:9985' });
            this.ws.on('open', () => {
                Bdb.searchMachines('"Machine:"').then((machines) => {
                    for (let machine of machines) {
                        if (machine.data.status !== "removed" && machine.bdbId !== this.machine.bdbId) {
                            this.machines[machine.bdbId] = { machine: machine };
                        }
                    }
                });
                Bdb.getAllMyAssets(this.keypair.publicKey).then((assets) => {
                    for (let asset of assets) {
                        this.modifyAssets(asset.asset.data.type, 1);
                    }
                });
                this.onStart();
            });
            this.ws.on('close', () => {
                //process.exit()
            });
            this.ws.on('message', (message) => {
                let data = JSON.parse(message);
                Bdb.getTransaction(data.transaction_id).then((transaction) => {
                    if (transaction.operation === "CREATE") {
                        let base = transaction.asset.data.id.split(":");
                        // new machine
                        if (base[0] === "Machine") {
                            Bdb.getMachine(data.transaction_id).then((machine) => {
                                this.machines[machine.bdbId] = machine;
                            });
                        }
                        // process updates
                        if (base[0] === "Update" &&
                            this.machines[base[1]] !== undefined) {
                            this.machines[base[1]].state = transaction.metadata;
                            this.machines[base[1]].state.publicKey = transaction.inputs[0].owners_before[0];
                        }
                        // new asset update if mine
                        if (base[0] === "Asset" &&
                            transaction.outputs[0].public_keys[0] === this.keypair.publicKey) {
                            this.modifyAssets(transaction.asset.data.type, 1);
                        }
                    }
                    else {
                        Bdb.getTransaction(data.asset_id).then((createTx) => {
                            let secBase = createTx.asset.data.id.split(":");
                            // process machine update
                            if (secBase[0] === "Machine") {
                                Bdb.getMachine(data.asset_id).then((machine) => {
                                    if (this.machine.bdbId === data.asset_id) {
                                        this.machine.data = machine.data;
                                        // check if removed
                                        if (this.machine.data.status === "removed") {
                                            this.shutdown();
                                        }
                                    }
                                    else {
                                        this.machines[machine.bdbId].data = machine.data;
                                        // check if removed
                                        if (machine.data.status === "removed") {
                                            delete this.machines[machine.bdbId];
                                        }
                                    }
                                });
                            }
                            // process my new asset
                            if (secBase[0] === "Asset" &&
                                transaction.outputs[0].public_keys[0] === this.keypair.publicKey) {
                                this.modifyAssets(createTx.asset.data.type, 1);
                            }
                            // process sending my asset
                            if (secBase[0] === "Asset" &&
                                transaction.outputs[0].public_keys[0] !== this.keypair.publicKey &&
                                transaction.inputs[0].owners_before[0] === this.keypair.publicKey) {
                                this.modifyAssets(createTx.asset.data.type, -1);
                            }
                        });
                    }
                });
            });
        };
        this.log = debug('Construct -> ' + this.constructor.name + ' -> ' + job.data.id);
        this.machine = job.data;
        this.status = "Loading";
    }
}
exports.default = Machine;
