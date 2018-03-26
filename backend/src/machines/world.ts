import Machine from '../machine'

export default class WorldMachine extends Machine {

  onStart=()=>{
    this.log("world started")

    // save start time
    let current = Math.floor(Date.now() / 1000)

    // run every 5 seconds
    this.intervals.push(setInterval(()=>{
      // send time updates
      this.custom = {
        currentTime: ((Math.floor(Date.now() / 1000) - current) % 300) * 4.8,
        currentScore: this.getScore(),
        gameover: this.checkGameover()
      }
      this.sendUpdates()
    }, 5000));

  }

}
