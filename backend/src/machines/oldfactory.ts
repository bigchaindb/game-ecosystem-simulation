import Machine from '../machine'

export default class OldFactoryMachine extends Machine {
  onStart=()=>{
    this.log("started")

    this.status = "Factory"

    // run every 5 seconds
    this.intervals.push(setInterval(()=>{
      this.sendUpdates()
    }, 5000));
  }
}
