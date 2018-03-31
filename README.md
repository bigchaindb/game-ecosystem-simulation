# game-ecosystem-simulation

This is ecosystem simulation presented as a game using concepts like digital twin and supply chain tracking.

## Quick development start

1. Clone the repo
2. Start needed services with `docker-compose up -d`
3. Run `docker-compose exec backend bash`

  1. run `npm run world`
  2. Open a text editor, and replace worldId with the results of `npm run world` into /frontend/src/app/app.config.ts and /backend/src/config.ts
  3. back in the backend bash-tab, run `npm run build`

4. `exit` the backend bash
5. `cd` to the /frontend folder

  1. run `npm install`
  2. run `npm run build`

6. Run `docker-compose restart` to restart all VMs, and go to <http://localhost>

### Modifying starting world

To wipe BigchainDB database, remove the `/bigchaindb` folder and reload starting world again with `npm run world`. `npm run world` command executes file /backend/src/world.ts that has all starting identities.

### Bugs and questions

Report bugs to issues and if you have problem first check issues if the problem was already solved.
