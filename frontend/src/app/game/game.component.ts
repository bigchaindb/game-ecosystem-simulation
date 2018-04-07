import { Component, ViewChild, OnInit, ElementRef, Input, HostListener, NgZone } from '@angular/core'
import { BdbService } from '../bdb.service'
import * as THREE from 'three'
import { THREESky } from '../sky.helper'
import { AppConfig } from '../app.config'
import { v4 as uuid } from 'uuid'
import { Observable } from 'rxjs/Observable'
import { Router } from '@angular/router'
import 'rxjs/add/observable/fromEvent'

// orbit controls hack
declare const require: (moduleId: string) => any;
const OrbitControls = require('three-orbit-controls')(THREE)

@Component({
  selector: 'app-game',
  host: {'(window:keydown)': 'keyPressed($event)'},
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.css']
})
export class GameComponent implements OnInit {

  @ViewChild('gamerender') gamerender: ElementRef

  @HostListener('window:resize') onResize() {
    this.onWindowResize()
  }

  // html
  showAllMachines = false
  showMyMachines = false
  showNewMachines = false
  currentTime = undefined
  currentScore = undefined

  // user
  logged = false
  loggedPublicKey = null

  // options
  optionsMaxFPS = 24
  optionsAntiAliasing = false // true - false
  optionsAnisotropyFiltering = 0  // 0 - 16  -> "renderer.capabilities.getMaxAnisotropy()"
  optionsPixelRatio = 1
  optionsShaderPrecision = "lowp" // "highp", "mediump" or "lowp"
  optionsShadows = false // true - false
  optionsShadowsType = THREE.PCFSoftShadowMap // THREE.BasicShadowMap -> THREE.PCFShadowMap -> THREE.PCFSoftShadowMap
  optionsShadowDetail = 2
  optionsPhysicallyCorrectLights = false
  optionsToneMapping = THREE.NoToneMapping // THREE.NoToneMapping THREE.LinearToneMapping THREE.ReinhardToneMapping THREE.Uncharted2ToneMapping THREE.CineonToneMapping

  // game
  gameSunlight = undefined
  gameUpdatesMs = 5000
  gameAssets = []
  gameObjectLoader: any
  gameJSONLoader: any
  gameTextureLoader: any
  gameScene: any
  gameCamera: any
  gameRenderer: any
  gameControls: any
  gameThenTime: any
  gameElapsedTime: any
  gameIntervalMaxFPS: any
  gameWebsocket: any
  gameObjects = []
  gameMouse: MouseEvent
  gameDeployingMachine = false
  gameTemporaryMachine: any = false
  gameRaycaster = new THREE.Raycaster()
  gameQuanterion = new THREE.Quaternion()
  gameMatrix = new THREE.Matrix4()
  gameRoadGeometry = new THREE.PlaneBufferGeometry( 1, 1 )
  gameTemporaryMachineColor = new THREE.MeshBasicMaterial( { color: 0xffffff, wireframe: true } )
  gameRoadMaterial: any
  gameGround: any
  gameGrid: any

  // machines
  machineDetails: any = false
  machines = {}
  machinesNew = [
    {name:"Car", type:"TransportMachine"},
    {name:"Energy Tree", type:"EnergyTreeMachine"},
    {name:"Printer Car", type:"PrinterCarMachine"},
  ]

  constructor(private router: Router, private zone: NgZone, private bdbService: BdbService) { }

  ngOnInit(): void {
    this.init()
  }

  init(){
    if(localStorage.getItem('user') === null){
      this.logged = false
    } else {
      this.logged = true
      this.loggedPublicKey = JSON.parse(localStorage.getItem('user')).publicKey
    }
    this.gameObjectLoader = new THREE.ObjectLoader()
    this.gameJSONLoader = new THREE.JSONLoader()
    this.gameTextureLoader = new THREE.TextureLoader()
    this.gameScene = new THREE.Scene()
    this.gameCamera = new THREE.PerspectiveCamera( 60, window.innerWidth/window.innerHeight, 0.1, 100000 )
    this.gameRenderer = new THREE.WebGLRenderer({
      antialias: this.optionsAntiAliasing,
      precision: this.optionsShaderPrecision
    })
    this.gameRenderer.setPixelRatio(this.optionsPixelRatio)
    this.gameRenderer.physicallyCorrectLights = this.optionsPhysicallyCorrectLights
    this.gameRenderer.shadowMap.enabled = this.optionsShadows
    this.gameRenderer.shadowMap.type = this.optionsShadowsType
    this.gameRenderer.toneMapping = this.optionsToneMapping
    this.gameRenderer.setSize( window.innerWidth, window.innerHeight )
    this.gamerender.nativeElement.appendChild(this.gameRenderer.domElement)
    this.gameControls = new OrbitControls(this.gameCamera, this.gameRenderer.domElement)
    this.gameControls.minDistance = 0
    this.gameControls.maxDistance = Infinity
    this.gameControls.zoomSpeed = 0.5
    this.gameControls.rotateSpeed = 0.5
    this.gameControls.minPolarAngle = 0
    this.gameControls.maxPolarAngle = Math.PI/2 -0.05
    this.gameControls.enableKeys = false
    this.gameControls.mouseButtons = {
      ORBIT: THREE.MOUSE.RIGHT,
      ZOOM: THREE.MOUSE.MIDDLE,
      PAN: THREE.MOUSE.LEFT
    }

    this.gameCamera.position.z = 20

    // init mouse events
    this.loadMouse()

    // load models
    this.loadGameAssets().then(()=>{

      // load world
      this.loadWorld()

      // load lights
      this.addLights()

      // load machines
      this.loadMachines().then(()=>{
        // start listening for changes
        this.listenMachineChanges()
      })

    })

    this.gameIntervalMaxFPS = 1000/this.optionsMaxFPS
    this.gameThenTime = performance.now()
    requestAnimationFrame(this.render.bind(this))
  }

  render() {
    let nowTime = performance.now()
    let elapsedTime = nowTime - this.gameThenTime
    if (elapsedTime >= this.gameIntervalMaxFPS) {
      this.gameThenTime = nowTime - (elapsedTime % this.gameIntervalMaxFPS)
      let delta = elapsedTime / 1000;
      // move objects
      this.moveObjects(nowTime,delta)
      // render
      this.gameRenderer.render(this.gameScene, this.gameCamera);
    }
    requestAnimationFrame(this.render.bind(this));
  }

  loadGameAssets() {
    // load road texture
    let roadTexture = this.gameTextureLoader.load( 'assets/textures/road3.png' )
    roadTexture.wrapS = roadTexture.wrapT = THREE.RepeatWrapping
    roadTexture.repeat.set( 1, 1 )
    roadTexture.anisotropy = this.optionsAnisotropyFiltering
    this.gameRoadMaterial = new THREE.MeshLambertMaterial( { map: roadTexture } )

    // load objects
    return Promise.all([
      this.loadWithObjectLoader('assets/models/Factory/Factory2.json','OldFactoryMachine',0.5),
      this.loadWithObjectLoader('assets/models/Factory/Factory2_playground.json','OldFactoryMachine_closed',0.5),
      this.loadWithObjectLoader('assets/models/House/House_bamboo_state1.json','HouseMachine',0.3),
      this.loadWithObjectLoader('assets/models/House/House_bamboo_state2.json','HouseMachine_step1',0.3),
      this.loadWithObjectLoader('assets/models/House/House_bamboo_highlighted.json','HouseMachine_step2',0.3),
      this.loadWithObjectLoader('assets/new/Car1/Futuristic_Car_2.1_blend_color2.json','TransportMachine',0.2),
      this.loadWithObjectLoader('assets/models/Printer/printer.json','PrinterCarMachine',0.2),
      this.loadWithObjectLoader('assets/models/EnergyTree/energy_tree.json','EnergyTreeMachine',0.5),
    ])
  }

  loadWithJSONLoader(filename,name) {
    return new Promise((resolve, reject)=>{
      this.gameJSONLoader.load(filename,(geometry,materials)=>{
        this.gameAssets[name] = {
          geometry: geometry,
          materials: materials
        }
        resolve()
      })
    })
  }

  loadWithObjectLoader(filename,name,scale) {
    return new Promise((resolve, reject)=>{
      new THREE.ObjectLoader().load(filename,(mesh)=>{
        mesh.scale.set(scale,scale,scale)
        this.gameAssets[name] = {
          mesh: mesh
        }
        resolve()
      })
    })
  }

  addLights() {
    // sun light
    this.gameSunlight = new THREE.DirectionalLight(0xdfebff,0)
    this.gameSunlight.castShadow = true
    this.gameSunlight.shadow.mapSize.width = Math.pow(2,10+this.optionsShadowDetail)
    this.gameSunlight.shadow.mapSize.height = Math.pow(2,10+this.optionsShadowDetail)
    this.gameSunlight.shadow.camera.left = -500
    this.gameSunlight.shadow.camera.right = 500
    this.gameSunlight.shadow.camera.top = 500
    this.gameSunlight.shadow.camera.bottom = -500
    this.gameSunlight.shadow.camera.far = 1100
    this.gameSunlight.shadow.bias = 0.00001
    this.gameSunlight.position.set(0,1000,0)
    this.gameScene.add(this.gameSunlight)

    // general light
    let ambientLight = new THREE.AmbientLight( 0xffffff, 0.75 );
    this.gameScene.add( ambientLight );
  }

  moveObjects(time,delta) {
    let msPassed = delta*1000;
    for(let bdbId in this.machines){
      if(this.machines[bdbId].mesh){
        if (this.machines[bdbId].locUntil > time) {
          this.machines[bdbId].mesh.position.setX(this.machines[bdbId].mesh.position.x + (this.machines[bdbId].locPerMs.x*msPassed));
          this.machines[bdbId].mesh.position.setY(this.machines[bdbId].mesh.position.y + (this.machines[bdbId].locPerMs.y*msPassed));
          this.machines[bdbId].mesh.position.setZ(this.machines[bdbId].mesh.position.z + (this.machines[bdbId].locPerMs.z*msPassed));
        }
      }
    }
  }

  onWindowResize() {
    this.gameCamera.aspect = window.innerWidth / window.innerHeight
    this.gameCamera.updateProjectionMatrix()
    this.gameRenderer.setSize( window.innerWidth, window.innerHeight )
  }

  loadWorld() {
    // load world from config
    this.bdbService.getTransaction(AppConfig.world).then((world)=>{
      this.gameGrid = world.asset.data.grid
      for (let i1=0; i1<this.gameGrid.length; i1++) {
        for (let j1=0; j1<this.gameGrid[i1].length; j1++) {
          if (this.gameGrid[i1][j1] === 0) {
            this.loadRoad(i1,j1,0)
          }
        }
      }
    })

    // floor geometry
    let floorTexture = this.gameTextureLoader.load( 'assets/textures/grass.jpg' );
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set( 2500, 2500 );
    floorTexture.anisotropy = this.optionsAnisotropyFiltering;
    let floorMaterial = new THREE.MeshLambertMaterial( { map: floorTexture } );
    this.gameGround = new THREE.Mesh( new THREE.PlaneBufferGeometry( 5000, 5000 ), floorMaterial );
    this.gameGround.rotation.x = -Math.PI/2
    this.gameGround.position.y = -0.01
    this.gameGround.castShadow = false
    this.gameGround.receiveShadow = true
    this.gameGround.name = "floor"
    this.gameScene.add(this.gameGround)

    // skydome
    let sky = new THREESky()
    sky.scale.setScalar(5000)
    sky.material.uniforms.turbidity.value = 10
    sky.material.uniforms.rayleigh.value = 2
    sky.material.uniforms.luminance.value = 1
    sky.material.uniforms.mieCoefficient.value = 0.005
    sky.material.uniforms.mieDirectionalG.value = 0.8
    sky.material.uniforms.sunPosition.value.x = 0
    sky.material.uniforms.sunPosition.value.y = 1000
    sky.material.uniforms.sunPosition.value.z = 0
    this.gameScene.add(sky)
  }

  loadRoad(x,y,z){
    let roadGround = new THREE.Mesh( this.gameRoadGeometry, this.gameRoadMaterial );
    roadGround.rotation.x = -Math.PI/2
    roadGround.position.x = y-50
    roadGround.position.y = 0
    roadGround.position.z = x-50
    roadGround.castShadow = false
    roadGround.receiveShadow = true
    roadGround.name = "road"
    this.gameScene.add(roadGround)
  }

  loadMouse(){
    // track mouse location
    Observable.fromEvent(document.body, 'mousemove').subscribe((e:MouseEvent) => {
      this.gameMouse = e
      if(this.gameTemporaryMachine !== false){
        let point = this.floorAtCursor()
        this.gameTemporaryMachine.position.set(point.x,point.y,point.z)
      }
    })
    // detect click on canvas
    this.gameRenderer.domElement.addEventListener("click", this.mouseClick.bind(this), false)
  }

  keyPressed(event){
    if (event.code === "Escape"){
      this.stopDeployingMachine()
    }
  }

  mouseClick(){
    if (this.gameDeployingMachine !== false) {
      this.addMachine()
    } else {
      this.machineDetails = this.machineAtCursor()
    }
  }

  deployMachine(machineType){
    // temporary machine
    let point = this.floorAtCursor()
    if(this.gameAssets[machineType].geometry !== undefined){
      this.gameTemporaryMachine = new THREE.Mesh(
        this.gameAssets[machineType].geometry,
        this.gameTemporaryMachineColor
      )
    }else{
      this.gameTemporaryMachine = this.gameAssets[machineType].mesh.clone()
      for(let child of this.gameTemporaryMachine.children){
        if(child.type === "Mesh"){
          child.material = this.gameTemporaryMachineColor
        }
      }
    }
    this.gameScene.add(this.gameTemporaryMachine);
    this.gameDeployingMachine = machineType
  }

  machineAtCursor(){
    let mouse = new THREE.Vector2()
    mouse.x = ( this.gameMouse.clientX / window.innerWidth ) * 2 - 1
    mouse.y = - ( this.gameMouse.clientY / window.innerHeight ) * 2 + 1
    this.gameRaycaster.setFromCamera( mouse, this.gameCamera )
    let intersects = this.gameRaycaster.intersectObjects( this.getMachinesForIntersection() )
    for (let intersect of intersects) {
      return intersect.object.userData
    }
    return false
  }

  getMachinesForIntersection(){
    let meshes = []
    for(let machine of this.gameScene.children){
      if(machine.name === "machine"){
        machine.traverse((node)=>{
          node.userData = machine.userData
          if (node instanceof THREE.Mesh){
            meshes.push(node)
          }
        })
      }
    }
    return meshes
  }

  floorAtCursor(){
    let mouse = new THREE.Vector2()
    mouse.x = ( this.gameMouse.clientX / window.innerWidth ) * 2 - 1
    mouse.y = - ( this.gameMouse.clientY / window.innerHeight ) * 2 + 1
    this.gameRaycaster.setFromCamera( mouse, this.gameCamera )
    let intersects = this.gameRaycaster.intersectObjects( [this.gameGround] )
    for (let intersect of intersects) {
      if (intersect.object.name === "floor") {
        return new THREE.Vector3(intersect.point.x,0,intersect.point.z).round()
      }
    }
  }

  getDeliveryLocation(location){
    let offset = 50
    if(this.gameGrid[location.z+offset][location.x+offset]===0)
      return new THREE.Vector3(location.x,0,location.z)
    for(let i=1; 10>i; i++){
      if(this.gameGrid[location.z+offset+i][location.x+offset+0]===0)
        return new THREE.Vector3(location.x+0,0,location.z+i)
      if(this.gameGrid[location.z+offset+0][location.x+offset+i]===0)
        return new THREE.Vector3(location.x+i,0,location.z+0)
      if(this.gameGrid[location.z+offset+0][location.x+offset-i]===0)
        return new THREE.Vector3(location.x-i,0,location.z+0)
      if(this.gameGrid[location.z+offset-i][location.x+offset+0]===0)
        return new THREE.Vector3(location.x+0,0,location.z-i)
      if(this.gameGrid[location.z+offset+i][location.x+offset+i]===0)
        return new THREE.Vector3(location.x+i,0,location.z+i)
      if(this.gameGrid[location.z+offset-i][location.x+offset-i]===0)
        return new THREE.Vector3(location.x-i,0,location.z-i)
      if(this.gameGrid[location.z+offset+i][location.x+offset-i]===0)
        return new THREE.Vector3(location.x-i,0,location.z+i)
      if(this.gameGrid[location.z+offset-i][location.x+offset+i]===0)
        return new THREE.Vector3(location.x+i,0,location.z-i)
    }
    return false
  }

  addMachine(){
    // get location of click on floor plane
    let location = this.floorAtCursor()
    let delivery = this.getDeliveryLocation(location)
    if(delivery===false){
      console.log("delivery location failed")
      return false
    }
    if (location !== undefined) {
      // create machine
      let keypair = JSON.parse(localStorage.getItem('user'))
      let asset = {
        id: 'Machine:'+uuid(),
        type: this.gameDeployingMachine,
      }
      let metadata = {
        loc:{x:location.x,y:location.y,z:location.z},
        del:{x:delivery.x,y:delivery.y,z:delivery.z}
      }
      this.bdbService.createNewAssetNoPull(keypair, asset, metadata)
      this.stopDeployingMachine()
    }
  }

  stopDeployingMachine(){
    this.gameDeployingMachine = false
    this.gameScene.remove(this.gameTemporaryMachine);
    this.gameTemporaryMachine = false
  }

  showMachineDetails(machineBdbid) {
    this.machineDetails = this.machines[machineBdbid]
  }

  async loadMachines() {
    await this.bdbService.searchMachines('"Machine:"').then((machines)=>{
      for (let machine of machines) {
        if(machine.data.status !== "removed") {
          this.machineToGame(machine)
        }
      }
      console.log("machines loaded")
    })
  }

  machineToGame(machine){
    this.machines[machine.bdbId] = machine
    this.machines[machine.bdbId].locPerMs = new THREE.Vector3(0,0,0)
    this.machines[machine.bdbId].locLast = new THREE.Vector3(
      machine.data.loc.x,
      machine.data.loc.y,
      machine.data.loc.z
    )
    this.machines[machine.bdbId].locUntil = performance.now()
    if(this.gameAssets[machine.type] !== undefined && this.gameAssets[machine.type].mesh !== undefined){
      this.machines[machine.bdbId].mesh = this.gameAssets[machine.type].mesh.clone()
      // new Transport and Energy machine needs printing
      if(machine.type === "TransportMachine" || machine.type === "EnergyTreeMachine"){
        for(let child of this.machines[machine.bdbId].mesh.children){
          if(child.type === "Mesh"){
            child.material = this.gameTemporaryMachineColor
          }
        }
      }
    }else{
      // new Transport and Energy machine needs printing
      if(machine.type === "TransportMachine" || machine.type === "EnergyTreeMachine"){
        this.machines[machine.bdbId].mesh = new THREE.Mesh(
          this.gameAssets[machine.type].geometry,
          this.gameTemporaryMachineColor
        )
      }else{
        this.machines[machine.bdbId].mesh = new THREE.Mesh(
          this.gameAssets[machine.type].geometry,
          this.gameAssets[machine.type].texture,
        )
      }
    }
    this.machines[machine.bdbId].mesh.position.set(
      machine.data.loc.x,
      machine.data.loc.y,
      machine.data.loc.z
    )
    this.machines[machine.bdbId].mesh.castShadow = true
    this.machines[machine.bdbId].mesh.receiveShadow = true
    this.machines[machine.bdbId].mesh.name = "machine"
    this.machines[machine.bdbId].mesh.userData = machine.bdbId
    this.gameScene.add(this.machines[machine.bdbId].mesh);
  }

  listenMachineChanges() {
    this.gameWebsocket = new WebSocket(AppConfig.bdb.wsScheme+AppConfig.bdb.wsHost+":"+AppConfig.bdb.wsPort+"/api/v1/streams/valid_transactions");
    this.gameWebsocket.onopen = ()=>{
      console.log('ws open');
    };
    this.gameWebsocket.onmessage = (event)=>{
      let data = JSON.parse(event.data)
      // is it create transaction?
      if(data.asset_id === data.transaction_id){
        this.bdbService.getTransaction(data.asset_id).then((transactions)=>{
          let base = transactions.asset.data.id.split(":");
          // new machine
          if(base[0] === "Machine"){
            this.bdbService.getMachine(data.asset_id).then((machine)=>{
              this.machineToGame(machine)
            })
          }
          // machine or world update
          if(base[0] === "Update"){
            if(base[1]==="World"){
              this.updateWorld(transactions.metadata.custom)
            }else{
              this.updateMachine(base,transactions)
            }
          }
        })
      } else {
        this.bdbService.getTransaction(data.asset_id).then((createTx)=>{
          let secBase = createTx.asset.data.id.split(":");
          // process machine update
          if(secBase[0] === "Machine"){
            this.bdbService.getMachine(data.asset_id).then((machine)=>{
              this.machines[createTx.id].data = machine.data
              if(machine.data.status === "removed"){
                this.gameScene.remove(this.machines[createTx.id].mesh)
                delete this.machines[createTx.id]
              }
              if(machine.type === "OldFactoryMachine" && machine.data.status === "closed"){
                this.updateModel(createTx.id,"OldFactoryMachine_closed")
              }
            })
          }
        })
      }
    };
    this.gameWebsocket.onclose = ()=>{
      console.log('ws closed')
    };
    this.gameWebsocket.onerror = ()=>{
      console.log('ws error')
    };
  }

  updateWorld=(data)=>{
    if(data.gameover === true){
      this.router.navigate(["/gameover"])
    }
    this.currentScore = data.currentScore
    this.currentTime = data.currentTime
  }

  updateMachine=(base,transactions)=>{
    if(this.machines[base[1]] !== undefined){
      // check for house state change
      if(
        this.machines[base[1]].type === "HouseMachine" &&
        this.machines[base[1]].state !== undefined &&
        transactions.metadata.has["Energy"] !== undefined &&
        this.machines[base[1]].state.has["Energy"] !== transactions.metadata.has["Energy"]
      ){
        if(transactions.metadata.has["Energy"] === 1){
          this.updateModel(base[1],"HouseMachine_step1")
        }
        if(transactions.metadata.has["Energy"] >= 2){
          this.updateModel(base[1],"HouseMachine_step2")
        }
      }
      // check for printing or broken machine state change
      if(
        transactions.metadata.status !== undefined &&
        (this.machines[base[1]].state !== undefined &&
        this.machines[base[1]].state.status !== transactions.metadata.status &&
        (this.machines[base[1]].state.status === "NeedsPrinting" ||
        this.machines[base[1]].state.status === "NeedsRepair")) &&
        (transactions.metadata.status !== "NeedsPrinting" ||
        transactions.metadata.status !== "NeedsRepair")
      ){
        this.updateModel(base[1], this.machines[base[1]].type)
      }
      this.machines[base[1]].state = transactions.metadata
      if(
        this.machines[base[1]].type === "PrinterCarMachine" ||
        this.machines[base[1]].type === "TransportMachine"
      ){
        this.machines[base[1]].locPerMs.set(
          (transactions.metadata.loc.x - this.machines[base[1]].mesh.position.x)/this.gameUpdatesMs,
          (transactions.metadata.loc.y - this.machines[base[1]].mesh.position.y)/this.gameUpdatesMs,
          (transactions.metadata.loc.z - this.machines[base[1]].mesh.position.z)/this.gameUpdatesMs
        )
        this.machines[base[1]].locUntil = performance.now()+this.gameUpdatesMs
        let v1 = new THREE.Vector3(
          transactions.metadata.loc.x,
          transactions.metadata.loc.y,
          transactions.metadata.loc.z
        )
        let v2 = new THREE.Vector3(
          this.machines[base[1]].mesh.position.x,
          this.machines[base[1]].mesh.position.y,
          this.machines[base[1]].mesh.position.z
        )
        var direction = new THREE.Vector3()
        direction.subVectors( v2, v1 )
        let angle = new THREE.Vector3(1, 0, 0).angleTo(direction)
        let axisRotation = new THREE.Vector3(0, 1, 0).normalize();
        if(Number.isNaN(angle) !== true){
          this.machines[base[1]].mesh.setRotationFromAxisAngle(axisRotation, angle+1.5708);
        }
      }
    }
  }

  updateModel = (machineId, machineType)=>{
    let tmpPosition = this.machines[machineId].mesh.position
    let tmpRotation = this.machines[machineId].mesh.rotation
    this.gameScene.remove(this.machines[machineId].mesh);

    if(this.gameAssets[machineType] !== undefined && this.gameAssets[machineType].mesh !== undefined){
      this.machines[machineId].mesh = this.gameAssets[machineType].mesh.clone()
    }else{
      this.machines[machineId].mesh = new THREE.Mesh(
        this.gameAssets[machineType].geometry,
        this.gameAssets[machineType].materials
      )
    }
    this.machines[machineId].mesh.position.set(
      tmpPosition.x,
      tmpPosition.y,
      tmpPosition.z
    )
    this.machines[machineId].mesh.rotation.set(
      tmpRotation.x,
      tmpRotation.y,
      tmpRotation.z
    )
    this.machines[machineId].mesh.castShadow = true
    this.machines[machineId].mesh.receiveShadow = true
    this.machines[machineId].mesh.name = "machine"
    this.machines[machineId].mesh.userData = machineId
    this.gameScene.add(this.machines[machineId].mesh);
    this.machines[machineId].mesh.needsUpdate = true
  }

  removeMachine = (machineId)=>{
    let keypair = JSON.parse(localStorage.getItem('user'))
    let metadata = {status:"removed"}
    let tx
    this.bdbService.getSortedTransactions(machineId).then((txs)=>{
      tx = txs[txs.length-1]
      this.bdbService.transferAsset(tx, keypair, keypair.publicKey, metadata)
    })
  }

  closeFactory = (machineId)=>{
    let keypair = JSON.parse(localStorage.getItem('user'))
    let metadata = {status:"close"}
    let tx
    this.bdbService.getSortedTransactions(machineId).then((txs)=>{
      tx = txs[txs.length-1]
      this.bdbService.transferAsset(tx, keypair, keypair.publicKey, metadata)
    })
  }

  toggleAllMachines = ()=>{
    this.showAllMachines = !this.showAllMachines
  }
  toggleMyMachines = ()=>{
    this.showMyMachines = !this.showMyMachines
  }
  toggleNewMachines = ()=>{
    this.showNewMachines = !this.showNewMachines
  }

  getKeys=(obj)=>{
    return Object.keys(obj)
  }

  convertMinsToHrsMins=(mins)=>{
    if(mins===undefined){
      return undefined
    }
    // day/night
    if(mins>=480 && 1300>mins){
      this.gameSunlight.intensity = 0.75
    }else{
      this.gameSunlight.intensity = 0
    }
    // calculate to day hours
    let h = Math.floor(mins / 60)
    let m = mins % 60
    h = h < 10 ? 0 + h : h
    m = m < 10 ? 0 + m : m
    return `${h}:${m}`
  }

  getJSON=(obj)=>{
    return JSON.stringify(obj)
  }

}
