var config: any = {}

config.hostBigchainDB = process.env.HOST_BIGCHAINDB ? process.env.HOST_BIGCHAINDB : "127.0.0.1"
config.portBigchainDB = process.env.PORT_BIGCHAINDB ? process.env.PORT_BIGCHAINDB : "9984"
config.hostRedis = process.env.HOST_REDIS ? process.env.HOST_REDIS : "127.0.0.1"
config.consumedIdentity = {
  publicKey: '2d7Zcys5T44VxCQAgcvP1wetUpRq1uKA7gMSYo8ycZ6Z',
  privateKey: 'FFZnLRSxf1V4cvwWVWoy2tSRdAtFrtAy9iRSfjmFHTPs'
}
config.updatesIdentity = {
  publicKey: '2dVgNp5P3m2mg6RXjZzeMgN14rrDqanx3KJZUztQsWhz',
  privateKey: 'DqU7WycFtwTPsePU25oNjWcm7PeFZdFv9Q52qX635wSn'
}
config.updatesOverIota = false
config.udpatesIotaAddress = "PHMKHHYVTAZDYJJQCQKLEKVOYLMDYUSNNKSDYUXXQQDASBDMGXVLTTAPPXOCMUUMAEW9GDU99T9MTWDBBXSMBNORQB"

config.worldId = "2593c0bb14611c6afe9599aaf99fab54eb0e260c6a07a828156671107ab83a2b"

module.exports = config
