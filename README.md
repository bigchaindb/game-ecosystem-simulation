# game-ecosystem-simulation

This is ecosystem simulation presented as a game using concepts like digital twin and supply chain tracking.

## Quick development start

1. Clone the repo
2. Do the ```npm install``` in /backend and /frontend
3. Install angular-cli globally ```npm install -g @angular/cli```
4. Start needed services with ```docker-compose up redis bigchaindb```
5. Compile backend with ```npm run build``` or watch with ```npm run watch``` from /backend
6. Initialize game world with ```npm run world``` from /backend and copy worldId to /frontend/src/app/app.config.ts and /backend/src/config.ts
7. Start frontend with ```npm run start``` from /frontend and navigate to ```http://localhost:4200/``` to see starting positions of the world.
8. Start backend with ```npm run start``` from /backend

### Modifying starting world

To wipe BigchainDB database use ```docker system prune --volumes``` and reload starting world again with ```npm run world```.
```npm run world``` command executes file /backend/src/world.ts that has all starting identities.

### Bugs and questions

Report bugs to issues and if you have problem first check issues if the problem was already solved.
