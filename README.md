# game-ecosystem-simulation

This is ecosystem simulation presented as a game using concepts like digital twin and supply chain tracking.

## Quick development start

1. Clone the repo
2. Do the ```npm install``` in /backend and /frontend
3. Install angular-cli globally ```npm install -g @angular/cli```
4. Start needed services with ```docker-compose up bigchaindb```
5. Initialize game world with ```npm run world``` from /backend and copy worldId to /frontend/src/app/app.config.ts and /backend/src/config.ts
6. Compile backend with ```npm run build``` from /backend
7. Compile frontend with ```npm run build``` from /frontend
8. Start whole system with ```docker-compose up```
9. Navigate to ```localhost``` for game

### Modifying starting world

To wipe BigchainDB database use ```docker system prune --volumes``` and reload starting world again with ```npm run world```.
```npm run smallerworld``` command executes file /backend/src/smallerworld.ts that has all starting identities.

### Bugs and questions

Report bugs to issues and if you have problem first check issues if the problem was already solved.
