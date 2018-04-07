import { Injectable } from '@angular/core';
import { AppConfig } from './app.config';
import * as driver from 'bigchaindb-driver'
import * as bip39 from 'bip39'

@Injectable()
export class BdbService {

  // connection object
  private conn

  // gets a Ed25519Keypair from a pass phrase
  getKeypairFromSeed(seed: string) {
    return new driver.Ed25519Keypair(bip39.mnemonicToSeed(seed).slice(0, 32))
  }

  // gets a Ed25519Keypair from a pass phrase
  createKeypairAndSeed() {
    const mnemonic =  bip39.generateMnemonic()
    console.log(mnemonic)
    const keypair = new driver.Ed25519Keypair(bip39.mnemonicToSeed(mnemonic).slice(0, 32))
    return {
      'passPhrase': mnemonic,
      'keyPair': keypair
    }
  }

  // gets a transaction based on id
  async getTransaction(txId: string) {
    try {
      await this._getConnection()
      const tx = await this.conn.getTransaction(txId)
      return tx
    } catch (err) {
      console.log(err)
      return null
    }
  }

  // gets a transaction based on id
  async getProfileFromPublickey(publicKey: string) {
    await this._getConnection()
    var profile
    var results = await this.getAssetsInWallet(publicKey, false)
    for (const res of results) {
      if (res.asset.data.data === "UserAsset") {
        profile = res.metadata
      }
    }
    return profile
  }

  // searches assets in BDB based on a text input
  async searchTypeInstances(text: string, link: string) {
    await this._getConnection()
    const txList = []
    const assetList = await this.conn.searchAssets(text)
    for (const asset of assetList) {
      if (asset.data.link === link) {
        const tx = await this.conn.getTransaction(asset.id)
        txList.push(tx)
      }
    }

    return txList
  }

  // searches assets in BDB based on a text input
  async searchAssetsGetFull(text: string) {
    await this._getConnection()
    const txList = []
    const assetList = await this.conn.searchAssets(text)
    for (const asset of assetList) {
        const tx = await this.getFullAssetAndMetadata(asset.id)
        txList.push(tx)
    }
    return txList
  }

  // returns full transaction with updates
  async getFullAssetAndMetadata(assetId: string) {
    await this._getConnection()
    const createTx = await this.getTransaction(assetId)
    const transfersTx = await this.getTransferTransactionsForAsset(assetId)
    const arr = []
    arr.push(createTx)
    for (const trtx of transfersTx) {
      arr.push(trtx)
    }
    return arr
  }

  // searches machines
  async searchMachines(text: string) {
    await this._getConnection()
    const txList = []
    const assetList = await this.conn.searchAssets(text)
    for (const asset of assetList) {
        const tx = await this.getMachine(asset.id)
        txList.push(tx)
    }
    return txList
  }

  // returns machine with updates
  async getMachine(assetId: string) {
    await this._getConnection()
    const createTx = await this.getTransaction(assetId)
    const transfersTx = await this.getTransferTransactionsForAsset(assetId)
    return {
      bdbId: createTx.id,
      id: createTx.asset.data.id,
      type: createTx.asset.data.type,
      owner: createTx.outputs[0].public_keys[0],
      data: Object.assign(createTx.metadata, ...transfersTx.map(tx => (tx.metadata)))
    }
  }

  // get all users
  async getAllUsers() {
    await this._getConnection()
    const txList = []
    const assetList = await this.conn.searchAssets('"UserAsset"')
    for (let asset of assetList) {
      let tx = await this.conn.getTransaction(asset.id)
      txList.push(tx)
    }
    return txList
  }

  // searches assets in BDB based on a text input
  async searchChildAssets(text: string, link: string, parent: string) {
    await this._getConnection()
    const txList = []
    const assetList = await this.conn.searchAssets(text)
    for (const asset of assetList) {
      if (asset.data.link === link && asset.data.parent === parent) {
        const tx = await this.conn.getTransaction(asset.id)
        txList.push(tx)
      }
    }

    return txList
  }

  // searches assets in BDB based on a text input
  async searchAssets(text: string) {
    await this._getConnection()
    const txList = []
    const assetList = await this.conn.searchAssets(text)
    console.log(assetList)
    for (const asset of assetList) {
        const tx = await this.conn.getTransaction(asset.id)
        txList.push(tx)
    }
    return txList
  }

  // searches metadata in BDB based on a text input
  async searchMetadata(text: string) {
    await this._getConnection()
    const txList = []
    const assetList = await this.conn.searchMetadata(text)
    for (const asset of assetList) {
        const tx = await this.conn.getTransaction(asset.id)
        txList.push(tx)
    }
    return txList
  }

  // gets all transfer transactions for an asset
  async getTransferTransactionsForAsset(assetId: string) {
    await this._getConnection()
    return this.conn.listTransactions(assetId, 'TRANSFER')
  }

  // gets all outputs (spent or unspent) from a wallet
  async getAssetsInWallet(publicKey: string, spent: boolean) {
    await this._getConnection()
    const assets = []
    const unSpent = await this.conn.listOutputs(publicKey, spent)

    if (!unSpent || !unSpent.length) {
      return []
    }

    for (const item of unSpent) {
      const tx = await this.conn.getTransaction(item.transaction_id)
      if (tx.operation === 'CREATE') {
        assets.push({
          'id': tx.id,
          'asset': tx.asset,
          'metadata': tx.metadata
        })
      } else {
        const crTx = await this.conn.getTransaction(tx.asset.id)
        assets.push({
          'id': crTx.id,
          'asset': crTx.asset,
          'metadata': crTx.metadata
        })
      }
    }

    return assets
  }

  // returns the blockchain history of an asset
  // under the hood, gets a list of metadata objects of all transfers of the asset
  async getAssetHistory(assetId: string) {
    await this._getConnection()

    const createTx = await this.getTransaction(assetId)
    const transferTx = await this.getTransferTransactionsForAsset(assetId)

    const assetData = createTx.asset.data
    const metadataArr = []
    metadataArr.push(createTx.metadata)
    for (const trtx of transferTx) {
      metadataArr.push(trtx.metadata)
    }

    metadataArr.sort((a, b) => b.timestamp - a.timestamp)
    return metadataArr
  }

  // Creates a new asset in BigchainDB
  async createNewAsset(keypair, asset, metadata) {
    await this._getConnection()
    const condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, true)

    const output = driver.Transaction.makeOutput(condition)
    output.public_keys = [keypair.publicKey]

    const transaction = driver.Transaction.makeCreateTransaction(
      asset,
      metadata,
      [output],
      keypair.publicKey
    )

    const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey)
    let tx
    await this.conn.postTransaction(txSigned)
      .then(() => this.conn.pollStatusAndFetchTransaction(txSigned.id))
      .then(retrievedTx => {
        tx = retrievedTx
        console.log('Asset Created: ' + retrievedTx.id);
      })

    return tx
  }

  // Creates a new asset in BigchainDB
  async createNewAssetNoPull(keypair, asset, metadata) {
    await this._getConnection()
    const condition = driver.Transaction.makeEd25519Condition(keypair.publicKey, true)

    const output = driver.Transaction.makeOutput(condition)
    output.public_keys = [keypair.publicKey]

    const transaction = driver.Transaction.makeCreateTransaction(
      asset,
      metadata,
      [output],
      keypair.publicKey
    )

    const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey)
    let tx
    this.conn.postTransaction(txSigned)
  }

  // Creates a new asset in BigchainDB
  async createNewAssetWithOwner(keypair, publickey, asset, metadata) {
    await this._getConnection()
    const condition = driver.Transaction.makeEd25519Condition(publickey, true)

    const output = driver.Transaction.makeOutput(condition)
    output.public_keys = [publickey]

    const transaction = driver.Transaction.makeCreateTransaction(
      asset,
      metadata,
      [output],
      keypair.publicKey
    )

    const txSigned = driver.Transaction.signTransaction(transaction, keypair.privateKey)
    let tx
    await this.conn.postTransaction(txSigned)
      .then(() => this.conn.pollStatusAndFetchTransaction(txSigned.id))
      .then(retrievedTx => {
        tx = retrievedTx
        console.log('Asset Created: ' + retrievedTx.id);
      })

    return tx
  }

  // Transfers a BigchainDB asset from an input transaction to a new public key
  async transferAsset(tx: any, fromKeyPair, toPublicKey, metadata) {
      await this._getConnection()

      const txTransfer = driver.Transaction.makeTransferTransaction(
          [{ tx: tx, output_index: 0 }],
          [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(toPublicKey))],
          metadata
      );

      const txSigned = driver.Transaction.signTransaction(txTransfer, fromKeyPair.privateKey)
      let trTx
      await this.conn.postTransaction(txSigned)
          .then(() => this.conn.pollStatusAndFetchTransaction(txSigned.id))
          .then(retrievedTx => {
              trTx = retrievedTx
          })

      return trTx
  }

  // Transfers a BigchainDB asset from an input transaction to a new public key
  async transferAssetNoPoll(tx: any, fromKeyPair, toPublicKey, metadata) {
      await this._getConnection()

      const txTransfer = driver.Transaction.makeTransferTransaction(
          [{ tx: tx, output_index: 0 }],
          [driver.Transaction.makeOutput(driver.Transaction.makeEd25519Condition(toPublicKey))],
          metadata
      );

      const txSigned = driver.Transaction.signTransaction(txTransfer, fromKeyPair.privateKey)
      this.conn.postTransaction(txSigned)
  }

  async getSortedTransactions(assetId) {
    return this.conn.listTransactions(assetId)
      .then((txList) => {
        if (txList.length <= 1) {
          return txList
        }
        const inputTransactions = []
        txList.forEach((tx) =>
          tx.inputs.forEach(input => {
            if (input.fulfills) {
              inputTransactions.push(input.fulfills.transaction_id)
            }
          })
        )
        const unspents = txList.filter((tx) => inputTransactions.indexOf(tx.id) === -1)
        if (unspents.length) {
          let tipTransaction = unspents[0]
          let tipTransactionId = tipTransaction.inputs[0].fulfills.transaction_id
          const sortedTxList = []
          while (true) { // eslint-disable-line no-constant-condition
            sortedTxList.push(tipTransaction)
            try {
              tipTransactionId = tipTransaction.inputs[0].fulfills.transaction_id
            } catch (e) {
              break
            }
            if (!tipTransactionId) {
              break
            }
            tipTransaction = txList.filter((tx) => // eslint-disable-line no-loop-func
              tx.id === tipTransactionId)[0]
          }
          return sortedTxList.reverse()
        } else {
          console.error('something went wrong while sorting transactions',
            txList, inputTransactions)
        }
        return txList
      })
  }

  // private: creates a connection to BDB server
  private async _getConnection() {
    if (!this.conn) {
      this.conn = new driver.Connection(AppConfig.bdb.apiScheme+AppConfig.bdb.apiHost+":"+AppConfig.bdb.apiPort+AppConfig.bdb.apiPath)
    }
  }
}
