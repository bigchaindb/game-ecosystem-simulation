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
const driver = require("bigchaindb-driver");
const bip39 = require("bip39");
const config = require('./config');
// gets a Ed25519Keypair from a pass phrase
function getKeypairFromSeed(seed) {
    return new driver.Ed25519Keypair(bip39.mnemonicToSeed(seed).slice(0, 32));
}
exports.getKeypairFromSeed = getKeypairFromSeed;
// gets a Ed25519Keypair from a pass phrase
function createKeypairAndSeed() {
    const mnemonic = bip39.generateMnemonic();
    const keypair = new driver.Ed25519Keypair(bip39.mnemonicToSeed(mnemonic).slice(0, 32));
    return {
        'passPhrase': mnemonic,
        'keyPair': keypair
    };
}
exports.createKeypairAndSeed = createKeypairAndSeed;
// gets a transaction based on id
function getTransaction(txId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield this._getConnection();
            const tx = yield this.conn.getTransaction(txId);
            return tx;
        }
        catch (err) {
            console.log(err);
            return null;
        }
    });
}
exports.getTransaction = getTransaction;
// searches assets in BDB based on a text input
function searchAssetsGetFull(text) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const txList = [];
        const assetList = yield this.conn.searchAssets(text);
        for (const asset of assetList) {
            const tx = yield this.getFullAssetAndMetadata(asset.id);
            txList.push(tx);
        }
        return txList;
    });
}
exports.searchAssetsGetFull = searchAssetsGetFull;
// returns full transaction with updates
function getFullAssetAndMetadata(assetId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const createTx = yield this.getTransaction(assetId);
        const transfersTx = yield this.getTransferTransactionsForAsset(assetId);
        const arr = [];
        arr.push(createTx);
        for (const trtx of transfersTx) {
            arr.push(trtx);
        }
        return arr;
    });
}
exports.getFullAssetAndMetadata = getFullAssetAndMetadata;
// searches machines
function searchMachines(text) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const txList = [];
        const assetList = yield this.conn.searchAssets(text);
        for (const asset of assetList) {
            const tx = yield this.getMachine(asset.id);
            txList.push(tx);
        }
        return txList;
    });
}
exports.searchMachines = searchMachines;
// returns machine with updates
function getMachine(assetId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const createTx = yield this.getTransaction(assetId);
        const transfersTx = yield this.getTransferTransactionsForAsset(assetId);
        return {
            bdbId: createTx.id,
            id: createTx.asset.data.id,
            type: createTx.asset.data.type,
            owner: createTx.outputs[0].public_keys[0],
            data: Object.assign(createTx.metadata, ...transfersTx.map(tx => (tx.metadata)))
        };
    });
}
exports.getMachine = getMachine;
// searches assets in BDB based on a text input
function searchTypeInstances(text, link) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const txList = [];
        const assetList = yield this.conn.searchAssets(text);
        for (const asset of assetList) {
            if (asset.data.link === link) {
                const tx = yield this.conn.getTransaction(asset.id);
                txList.push(tx);
            }
        }
        return txList;
    });
}
exports.searchTypeInstances = searchTypeInstances;
// get owned assets
function getAllMyAssets(publicKey) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const assets = [];
        const unSpent = yield this.conn.listOutputs(publicKey, false);
        if (!unSpent || !unSpent.length) {
            return [];
        }
        for (const item of unSpent) {
            const tx = yield this.conn.getTransaction(item.transaction_id);
            if (tx.operation === 'CREATE') {
                assets.push({
                    'id': tx.id,
                    'asset': tx.asset
                });
            }
            else {
                const crTx = yield this.conn.getTransaction(tx.asset.id);
                assets.push({
                    'id': crTx.id,
                    'asset': crTx.asset
                });
            }
        }
        return assets;
    });
}
exports.getAllMyAssets = getAllMyAssets;
// get all users
function getAllUsers() {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const txList = [];
        const assetList = yield this.conn.searchAssets('"UserAsset"');
        for (let asset of assetList) {
            let tx = yield this.conn.getTransaction(asset.id);
            txList.push(tx);
        }
        return txList;
    });
}
exports.getAllUsers = getAllUsers;
// searches assets in BDB based on a text input
function searchChildAssets(text, link, parent) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const txList = [];
        const assetList = yield this.conn.searchAssets(text);
        for (const asset of assetList) {
            if (asset.data.link === link && asset.data.parent === parent) {
                const tx = yield this.conn.getTransaction(asset.id);
                txList.push(tx);
            }
        }
        return txList;
    });
}
exports.searchChildAssets = searchChildAssets;
// gets all transfer transactions for an asset
function getTransferTransactionsForAsset(assetId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        return this.conn.listTransactions(assetId, 'TRANSFER');
    });
}
exports.getTransferTransactionsForAsset = getTransferTransactionsForAsset;
// gets all outputs (spent or unspent) from a wallet
function getAssetsInWallet(publicKey, spent) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const assets = [];
        const unSpent = yield this.conn.listOutputs(publicKey, spent);
        if (!unSpent || !unSpent.length) {
            return [];
        }
        for (const item of unSpent) {
            const tx = yield this.conn.getTransaction(item.transaction_id);
            if (tx.operation === 'CREATE') {
                assets.push({
                    'id': tx.id,
                    'asset': tx.asset,
                    'metadata': tx.metadata
                });
            }
            else {
                const crTx = yield this.conn.getTransaction(tx.asset.id);
                assets.push({
                    'id': crTx.id,
                    'asset': crTx.asset,
                    'metadata': crTx.metadata,
                    'unspentTx': tx
                });
            }
        }
        return assets;
    });
}
exports.getAssetsInWallet = getAssetsInWallet;
// returns the blockchain history of an asset
// under the hood, gets a list of metadata objects of all transfers of the asset
function getAssetHistory(assetId) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const createTx = yield this.getTransaction(assetId);
        const transferTx = yield this.getTransferTransactionsForAsset(assetId);
        const assetData = createTx.asset.data;
        const metadataArr = [];
        metadataArr.push(createTx.metadata);
        for (const trtx of transferTx) {
            metadataArr.push(trtx.metadata);
        }
        return metadataArr;
    });
}
exports.getAssetHistory = getAssetHistory;
// Creates a new asset in BigchainDB
function createNewAsset(keypair, asset, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, true);
        const output = driver.Transaction.makeOutput(condition);
        output.public_keys = [keypair.publicKey];
        const transaction = driver.Transaction.makeCreateTransaction(asset, metadata, [output], keypair.publicKey);
        const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey);
        let tx;
        yield this.conn.postTransaction(txSigned)
            .then(() => this.conn.pollStatusAndFetchTransaction(txSigned.id))
            .then(retrievedTx => {
            tx = retrievedTx;
        });
        return tx;
    });
}
exports.createNewAsset = createNewAsset;
// Creates a new asset in BigchainDB
function createNewAssetNoPoll(keypair, asset, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, true);
        const output = driver.Transaction.makeOutput(condition);
        output.public_keys = [keypair.publicKey];
        const transaction = driver.Transaction.makeCreateTransaction(asset, metadata, [output], keypair.publicKey);
        const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey);
        this.conn.postTransaction(txSigned);
    });
}
exports.createNewAssetNoPoll = createNewAssetNoPoll;
// Creates a new asset in BigchainDB
function createNewAssetWithOwner(keypair, publickey, asset, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const condition = driver.Transaction.makeEd25519Condition(publickey, true);
        const output = driver.Transaction.makeOutput(condition);
        output.public_keys = [publickey];
        const transaction = driver.Transaction.makeCreateTransaction(asset, metadata, [output], keypair.publicKey);
        const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey);
        let tx;
        yield this.conn.postTransaction(txSigned)
            .then(() => this.conn.pollStatusAndFetchTransaction(txSigned.id))
            .then(retrievedTx => {
            tx = retrievedTx;
            //console.log('Asset Created: ' + retrievedTx.id);
        });
        return tx;
    });
}
exports.createNewAssetWithOwner = createNewAssetWithOwner;
// Creates a new asset in BigchainDB
function createNewAssetWithOwnerNoPoll(keypair, publickey, asset, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const condition = driver.Transaction.makeEd25519Condition(publickey, true);
        const output = driver.Transaction.makeOutput(condition);
        output.public_keys = [publickey];
        const transaction = driver.Transaction.makeCreateTransaction(asset, metadata, [output], keypair.publicKey);
        const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey);
        this.conn.postTransaction(txSigned);
    });
}
exports.createNewAssetWithOwnerNoPoll = createNewAssetWithOwnerNoPoll;
function transferAssets(keypair, type, amount, toPublicKey) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        let assets = [];
        let unSpent = yield this.conn.listOutputs(keypair.publicKey, false);
        if (!unSpent || !unSpent.length) {
            //console.log("no assets")
            return;
        }
        for (let item of unSpent) {
            let tx = yield this.conn.getTransaction(item.transaction_id);
            if (tx.operation === 'CREATE') {
                if (tx.asset.data.type === type) {
                    assets.push(tx);
                }
            }
            else {
                let crTx = yield this.conn.getTransaction(tx.asset.id);
                if (crTx.asset.data.type === type) {
                    assets.push(tx);
                }
            }
        }
        if (assets.length < amount) {
            //console.log('not enough assets')
            amount = assets.length;
        }
        for (let i = 0; i < amount; i++) {
            let metadata = { time: Date.now() };
            this.transferAssetNoPoll(assets[i], keypair, toPublicKey, metadata);
        }
        //console.log('ended transfer bdb')
    });
}
exports.transferAssets = transferAssets;
// Creates a new divisible asset in BigchainDB
function createNewDivisibleAsset(keypair, asset, metadata, amount) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, true);
        const output = driver.Transaction.makeOutput(condition, amount.toString());
        output.public_keys = [keypair.publicKey];
        const transaction = driver.Transaction.makeCreateTransaction(asset, metadata, [output], keypair.publicKey);
        const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey);
        let tx;
        yield this.conn.postTransaction(txSigned)
            .then(() => this.conn.pollStatusAndFetchTransaction(txSigned.id))
            .then(retrievedTx => {
            tx = retrievedTx;
        });
        return tx;
    });
}
exports.createNewDivisibleAsset = createNewDivisibleAsset;
// Transfers a BigchainDB asset from an input transaction to a new public key
function transferAsset(tx, fromKeyPair, toPublicKey, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const txTransfer = driver.Transaction.makeTransferTransaction([{ tx: tx, output_index: 0 }], [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(toPublicKey))], metadata);
        const txSigned = driver.Transaction.signTransaction(txTransfer, fromKeyPair.privateKey);
        let trTx;
        yield this.conn.postTransaction(txSigned)
            .then(() => this.conn.pollStatusAndFetchTransaction(txSigned.id))
            .then(retrievedTx => {
            trTx = retrievedTx;
        });
        return trTx;
    });
}
exports.transferAsset = transferAsset;
// Transfers a BigchainDB asset from an input transaction to a new public key
function transferAssetNoPoll(tx, fromKeyPair, toPublicKey, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        const txTransfer = driver.Transaction.makeTransferTransaction([{ tx: tx, output_index: 0 }], [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(toPublicKey))], metadata);
        const txSigned = driver.Transaction.signTransaction(txTransfer, fromKeyPair.privateKey);
        this.conn.postTransaction(txSigned);
    });
}
exports.transferAssetNoPoll = transferAssetNoPoll;
function transferDivisibleAsset(tx, fromKeyPair, toPublicKeysAmounts, metadata) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        let receivers = [];
        for (let entry of toPublicKeysAmounts) {
            let output = driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(entry.publicKey), entry.amount.toString());
            receivers.push(output);
        }
        const txTransfer = driver.Transaction.makeTransferTransaction([{ tx: tx, output_index: 0 }], receivers, null);
        const txSigned = driver.Transaction.signTransaction(txTransfer, fromKeyPair.privateKey);
        let trTx;
        yield this.conn.postTransaction(txSigned)
            .then(() => this.conn.pollStatusAndFetchTransaction(txSigned.id))
            .then(retrievedTx => {
            trTx = retrievedTx;
        });
        return trTx;
    });
}
exports.transferDivisibleAsset = transferDivisibleAsset;
function getSortedTransactions(assetId) {
    return __awaiter(this, void 0, void 0, function* () {
        return this.conn.listTransactions(assetId)
            .then((txList) => {
            if (txList.length <= 1) {
                return txList;
            }
            const inputTransactions = [];
            txList.forEach((tx) => tx.inputs.forEach(input => {
                if (input.fulfills) {
                    inputTransactions.push(input.fulfills.transaction_id);
                }
            }));
            const unspents = txList.filter((tx) => inputTransactions.indexOf(tx.id) === -1);
            if (unspents.length) {
                let tipTransaction = unspents[0];
                let tipTransactionId = tipTransaction.inputs[0].fulfills.transaction_id;
                const sortedTxList = [];
                while (true) { // eslint-disable-line no-constant-condition
                    sortedTxList.push(tipTransaction);
                    try {
                        tipTransactionId = tipTransaction.inputs[0].fulfills.transaction_id;
                    }
                    catch (e) {
                        break;
                    }
                    if (!tipTransactionId) {
                        break;
                    }
                    tipTransaction = txList.filter((tx) => // eslint-disable-line no-loop-func
                     tx.id === tipTransactionId)[0];
                }
                return sortedTxList.reverse();
            }
            else {
                console.error('something went wrong while sorting transactions', txList, inputTransactions);
            }
            return txList;
        });
    });
}
exports.getSortedTransactions = getSortedTransactions;
function getOutputs(publicKey, spent = false) {
    return __awaiter(this, void 0, void 0, function* () {
        yield this._getConnection();
        return yield this.conn.listOutputs(publicKey, spent);
    });
}
exports.getOutputs = getOutputs;
function transferTokens(keypair, tokenId, amount, toPublicKey) {
    return __awaiter(this, void 0, void 0, function* () {
        const balances = [];
        const outputs = [];
        let cummulativeAmount = 0;
        let sufficientFunds = false;
        const trAmount = parseInt(amount);
        const unspents = yield getOutputs(keypair.publicKey, false);
        if (unspents && unspents.length > 0) {
            for (const unspent of unspents) {
                const tx = yield this.conn.getTransaction(unspent.transaction_id);
                let assetId;
                if (tx.operation === 'CREATE') {
                    assetId = tx.id;
                }
                if (tx.operation === 'TRANSFER') {
                    assetId = tx.asset.id;
                }
                if (assetId === tokenId) {
                    const txAmount = parseInt(tx.outputs[unspent.output_index].amount);
                    cummulativeAmount += txAmount;
                    balances.push({
                        tx: tx,
                        output_index: unspent.output_index
                    });
                }
                if (cummulativeAmount >= trAmount) {
                    sufficientFunds = true;
                    break;
                }
            }
            if (!sufficientFunds) {
                throw new Error('Transfer failed. Not enough token balance!');
            }
            outputs.push({
                publicKey: toPublicKey,
                amount: trAmount
            });
            if (cummulativeAmount - trAmount > 0) {
                outputs.push({
                    publicKey: keypair.publicKey,
                    amount: cummulativeAmount - trAmount
                });
            }
            const metadata = {
                event: 'Stake Transfer',
                date: new Date(),
                timestamp: Date.now()
            };
            const transfer = yield this.conn.transferMultipleAssets(balances, keypair, outputs, metadata);
            return transfer;
        }
        throw new Error('Transfer failed. Not enough token balance!');
    });
}
exports.transferTokens = transferTokens;
function getTokenBalance(publicKey, tokenId) {
    return __awaiter(this, void 0, void 0, function* () {
        const unspents = yield getOutputs(publicKey, false);
        let cummulativeAmount = 0;
        let ownsTokens = false;
        if (unspents && unspents.length > 0) {
            for (const unspent of unspents) {
                const tx = yield this.conn.getTransaction(unspent.transaction_id);
                let assetId;
                if (tx.operation === 'CREATE') {
                    assetId = tx.id;
                }
                if (tx.operation === 'TRANSFER') {
                    assetId = tx.asset.id;
                }
                if (assetId === tokenId) {
                    ownsTokens = true;
                    const txAmount = parseInt(tx.outputs[unspent.output_index].amount);
                    cummulativeAmount += txAmount;
                }
            }
            if (ownsTokens) {
                return {
                    token: tokenId,
                    amount: cummulativeAmount
                };
            }
            else {
                return {
                    token: tokenId,
                    amount: 0
                };
            }
        }
    });
}
exports.getTokenBalance = getTokenBalance;
// private: creates a connection to BDB server
function _getConnection() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!this.conn) {
            this.conn = new driver.Connection('http://' + config.hostBigchainDB + ':' + config.portBigchainDB + '/api/v1/');
        }
    });
}
exports._getConnection = _getConnection;
