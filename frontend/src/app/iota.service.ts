import { Injectable } from '@angular/core';
import { AppConfig } from './app.config';
import * as IOTA from 'iota.lib.js'


@Injectable()
export class IotaService {

  private iotaConn

  constructor(){
    this.iotaConn = new IOTA({
      host: AppConfig.iota.apiScheme + AppConfig.iota.apiUrl,
      port: AppConfig.iota.apiPort
    });
  }

  async getTransactionsForSeed(seed){
    return new Promise((resolve, reject) => {
      this.iotaConn.api.getTransfers(seed, {start:0,end:0,security:0,inclusionStates:false}, (e,data)=>{
        console.log(data)
        let transactions = []
        if(e == null){
          for (let transfer of data) {
            try {
              let message = this.iotaConn.utils.extractJson(transfer)
              message = JSON.parse(message)
              transactions.push(message)
            } catch(error) {
              console.log("Transaction did not contain any JSON Data");
              reject()
            }
          }
        }else{
          console.log(e)
          reject()
        }
        resolve(transactions)
      })
    })
  }

  async getNodeInfo(){
    return new Promise((resolve, reject) => {
      this.iotaConn.api.getNodeInfo((e,data)=>{
        resolve(data)
      })
    })
  }

}
