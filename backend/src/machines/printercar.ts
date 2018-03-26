import Machine from '../machine'

export default class PrinterCarMachine extends Machine {
  onStart=()=>{
    this.log("started")

    this.status = "Started"

    // main processing loop
    this.intervals.push(setInterval(()=>{

      // find target
      let machines = this.getNearestNeedsPrinter(50)
      // Am I there yet
      if(machines.length > 0){
        if(machines[0].distance === 0){
          // I'm here
          this.status = "Printing"
        } else {
          // move there
          this.status = "Moving"
          this.moveTowards(machines[0].id)
        }
      } else {
        this.log("no machines need printing")
      }

      this.sendUpdates()
    }, 5000));
  }
}
