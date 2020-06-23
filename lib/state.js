/* This is the game state file for pubg.io
 * @author TakLee96 / jiahang_li@outlook.com
 **/

// Constants
const PLAYER_VELOCITY = 30;
const DISPLAY_WIDTH = 1280;
const DISPLAY_HEIGHT = 720;

// Helper Classes
class Geometry {
  constructor({shape, color, size}) {
    this.shape = shape;
    this.color = color;
    this.size = size;
  }
}

class Box extends Geometry {
  constructor() {
    super({
      shape: 'square',
      color: '#937710',
      size: { width: 60, height: 60 },
    });
  }
}

class Weapon {
  constructor({angles, range, cooldown}) {
    this.angles = angles;
    this.range = range;
    this.cooldown = cooldown;
  }
}

class Pistol {
  constructor() {
    super({angles: [ 0 ], range: 300, cooldown: 500});
  }
}

class Player extends Geometry {
  constructor({ username, color }) {
    super({
      shape: 'circle',
      color,
      size: { radius: 20 }
    });
    
    this.username = username;
    this.hp = 100;
    this.lastShot = Date.now();
    this.weapon = new Pistol();
  }
  
  canShoot() {
    return Date.now() - this.lastShot > this.weapon.cooldown;
  }
}

class MapObject {
  constructor(geometry, x, y) {
    this.geometry = geometry;
    this.x = x;
    this.y = y;
  }
}

class Map { // refrehes per match
  constructor() {
    this.players = {};     // maps playerId to MapObject<Player>
    this.pickable = [];    // list of MapObject<Pickable>
    this.structures = [];  // list of MapObject<Structure>
    
    for (let i = 1; i < 4; i++) {
      for (let j = 1; j < 4; j++) {
        this.structures.push(new MapObject(new Box(), i * 500, j * 500));
      }
    }
    
    this.size = { width: 2000, height: 2000 };
  }
  
  addPlayer(playerId, player) {
    let x = Math.random() * this.size.width;
    let y = Math.random() * this.size.height;
    this.players[playerId] = new MapObject(new Player(player), x, y);
  }
  
  movePlayer(playerId, direction) {
    let { x, y } = direction;
    let norm = Math.sqrt(x * x + y * y);
    let dx = x * PLAYER_VELOCITY / norm;
    let dy = y * PLAYER_VELOCITY / norm;
    this.players[playerId].x = Math.min(this.size.width, Math.max(0, this.players[playerId].x + dx))
    this.players[playerId].y = Math.min(this.size.height, Math.max(0, this.players[playerId].y + dy))
  }
  
  removePlayer(playerId) {
    delete this.players[playerId];
  }
  
  shootPlayer(playerId, direction) {
    if (this.players[playerId].canShoot()) {
      // TODO: compute HP update
      // need design decision, either send feedback to user regarding the current shot and update related player
      // or globally store these shots and update related player
      return true;
    }
    return false;
  }
  
  getNeighbors(playerId) {
    let myLoc = this.players[playerId];
    let neighbors = [];
    for (let otherId of Object.keys(this.players)) {
      let otherLoc = this.players[otherId];
      if (Math.abs(otherLoc.x - myLoc.x) < DISPLAY_WIDTH &&
          Math.abs(otherLoc.y - myLoc.y) < DISPLAY_HEIGHT) {
        neighbors.push(otherId);
      }
    }
    return neighbors;
  }
}

class State { // persistents until server dies
  constructor() {
    this.players = {};  // maps playerId to playerJSON
    this.map = new Map();
  }
  
  addPlayer(client, player) { // TODO: validate player
    let playerId = client.id;
    this.players[playerId] = player;
    this.map.addPlayer(playerId, player);
  }
  
  removePlayer(client) {
    let playerId = client.id;
    delete this.players[playerId];
    this.map.removePlayer(playerId);
  }
  
  action(client, action) { // TODO: validate action
    let playerId = client.id;
    if (this.players[playerId]) {
      switch (action.type) {
        case 'MOVE': this.map.movePlayer(playerId, action.direction); break;
        case 'SHOOT': this.map.shootPlayer(playerId, action.direction); break;
        default:
          console.error(`unknown action ${client.id} ${action}`);
      }
    }
  }
  
  neighbors(client) {
    return this.map.getNeighbors(client.id);
  }
}

const isNode = new Function("try {return this===global;}catch(e){return false;}");
if (isNode()) {
  module.exports = State;
}
