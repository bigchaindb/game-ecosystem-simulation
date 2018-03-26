import * as Queue from 'bull'
import * as WebSocket from 'ws'
import * as Iota from './iota'
import * as Bdb from './bdb'
import * as debug from 'debug'

// import machines
import WorldMachine from './machines/world'
import TransportMachine from './machines/transport'
import EnergyTreeMachine from './machines/energytree'
import OldFactoryMachine from './machines/oldfactory'
import PrinterCarMachine from './machines/printercar'
import HouseMachine from './machines/house'

// loadable machines
const loadMachine = {
  WorldMachine,
  TransportMachine,
  EnergyTreeMachine,
  OldFactoryMachine,
  PrinterCarMachine,
  HouseMachine
};

// config
const config = require('./config')
// log
const log = debug('Construct')
// define queue
const construct = new Queue('construct', {
  redis:{
    port: 6379,
    host: config.hostRedis
  },
  settings:{
    stalledInterval: 0
  }
})

exports.startWorker=()=>{
  construct.process(9999,(job,done)=>{
    //return new loadMachine[job.data.type](job).load()
    let jobby = new loadMachine[job.data.type](job)
    jobby.load().then(()=>{
      done()
    });
  });
}

exports.startLoader=()=>{
  log('initializing')
  // add world machine
  construct.add({
    id:"World:World", type:"WorldMachine", owner: "World", bdbId: "World",
    data: { loc: { x: 0, y: 0, z: 0 }, del: { x: 0, y: 0, z: 0 } }
  })
  // connect to bdb websocket
  let ws_url = 'ws://'+config.hostBigchainDB+':9985/api/v1/streams/valid_transactions'
  let ws = new WebSocket(ws_url, {origin: 'http://localhost:9985'});
  ws.on('open', ()=>{
    // get all machines and start them
    Bdb.searchMachines('"Machine:"').then((machines)=>{
      for (let machine of machines) {
        if(machine.data.status !== "removed") {
          construct.add(machine)
        }
      }
    })
  });
  ws.on('close', ()=>{
    // exit if closed
    log('bdb disconnected')
    process.exit()
  });
  ws.on('message', (message)=>{
    let data = JSON.parse(message)
    // is it create transaction?
    if(data.asset_id === data.transaction_id){
      Bdb.getTransaction(data.asset_id).then((transaction)=>{
        // check if machine
        if(transaction.asset.data.id.substr(0, 7) === "Machine"){
          Bdb.getMachine(data.asset_id).then((machine)=>{
            construct.add(machine)
          })
        }
      })
    }
  });
}
