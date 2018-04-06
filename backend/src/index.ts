import * as debug from 'debug'
import * as cluster from 'cluster'

// config
const config = require('./config')

// load construct
const construct = require('./construct')

// number of cpus
//const numCPUs = require('os').cpus().length
const numCPUs = 2

// env
const env = process.env

if (cluster.isMaster) {
  switch(env['BACKEND_TYPE']) {
    case 'master':
      spawnMaster()
    break
    case 'worker':
      spawnWorkers(numCPUs)
    break
    default:
      spawnMaster()
      spawnWorkers(numCPUs-1)
    break
  }
} else {
  switch(env['WORKER_TYPE']) {
    case 'master':
      construct.startLoader()
    break
    case 'worker':
      construct.startWorker()
    break
  }
}

function spawnMaster(){
  env['WORKER_TYPE'] = 'master'
  cluster.fork(env)
}

function spawnWorkers(num){
  env['WORKER_TYPE'] = "worker"
  for (let i=0; i<num; i++) {
    cluster.fork(env)
  }
}
