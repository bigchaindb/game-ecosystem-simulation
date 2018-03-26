"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const IOTA = require("iota.lib.js");
const config = require('./config');
//const iota = new IOTA({ provider:"http://node01.testnet.iotatoken.nl:16265" })
const iota = new IOTA({ provider: 'https://nodes.testnet.iota.org:443' });
//const iota = new IOTA({ provider: 'http://localhost:14265' })
const remoteCurl = require('@iota/curl-remote');
remoteCurl(iota, `https://powbox.testnet.iota.org`, 500);
function makeSeed() {
    let seed = "";
    let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ9";
    for (let i = 0; i < 82; i++)
        seed += possible.charAt(Math.floor(Math.random() * possible.length));
    return seed;
}
exports.makeSeed = makeSeed;
function getAddressFromSeed(seed) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            iota.api.getNewAddress(seed, { 'checksum': true }, (e, address) => {
                if (!e) {
                    resolve(address);
                }
                else {
                    console.log(e);
                    reject();
                }
            });
        });
    });
}
exports.getAddressFromSeed = getAddressFromSeed;
function sendTransaction(seed, address, data) {
    return __awaiter(this, void 0, void 0, function* () {
        var transfer = [{
                'address': address,
                'value': 0,
                'message': iota.utils.toTrytes(JSON.stringify({ data: data }))
            }];
        return new Promise((resolve, reject) => {
            try {
                iota.api.sendTransfer(seed, 3, 9, transfer, function (e, bundle) {
                    if (e) {
                        console.log(e);
                        reject();
                    }
                    resolve();
                });
            }
            catch (e) {
                console.log(e);
                reject();
            }
        });
    });
}
exports.sendTransaction = sendTransaction;
function findTransactionObjects(searchValues) {
    return __awaiter(this, void 0, void 0, function* () {
        return new Promise((resolve, reject) => {
            iota.api.findTransactionObjects(searchValues, function (array) {
                resolve(array);
            });
        });
    });
}
exports.findTransactionObjects = findTransactionObjects;
