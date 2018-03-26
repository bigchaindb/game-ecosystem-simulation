import * as IOTA from 'iota.lib.js'

const config = require('./config');

//const iota = new IOTA({ provider:"http://node01.testnet.iotatoken.nl:16265" })
const iota = new IOTA({ provider: 'https://nodes.testnet.iota.org:443' })
//const iota = new IOTA({ provider: 'http://localhost:14265' })
const remoteCurl = require('@iota/curl-remote')
remoteCurl(iota, `https://powbox.testnet.iota.org`, 500)

export function makeSeed(){
  let seed = ""
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZ9"
  for (let i = 0; i < 82; i++)
    seed += possible.charAt(Math.floor(Math.random() * possible.length))
  return seed
}

export async function getAddressFromSeed(seed){
  return new Promise<string>((resolve, reject) => {
    iota.api.getNewAddress(seed, {'checksum': true}, (e, address)=>{
      if (!e) {
        resolve(address)
      } else {
        console.log(e)
        reject()
      }
    })
  })
}

export async function sendTransaction(seed,address,data){
    var transfer = [{
      'address': address,
      'value': 0,
      'message': iota.utils.toTrytes(JSON.stringify({data:data}))
    }]
    return new Promise<any>((resolve, reject) => {
      try {
        iota.api.sendTransfer(seed, 3, 9, transfer, function(e, bundle) {
          if (e) {
            console.log(e)
            reject()
          }
          resolve()
        })
      } catch (e) {
        console.log(e);
        reject()
      }
    })
}

export async function findTransactionObjects(searchValues){
  return new Promise<any>((resolve, reject) => {
    iota.api.findTransactionObjects(searchValues, function(array){
      resolve(array)
    })
  })
}
