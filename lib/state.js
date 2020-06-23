/* This is the game state file for pubg.io
 * @author TakLee96 / jiahang_li@outlook.com
 **/

// Constants
const PLAYER_VELOCITY = 30;

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

class Player extends Geometry {
  constructor({ username, color }) {
    super({
      shape: 'circle',
      color,
      size: { radius: 20 }
    });
    
    this.username = username;
    this.hp = 100;
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
    // TODO: implement
  }
}

class State { // persistents until server dies
  constructor() {
    this.players = {};  // maps playerId to playerJSON
    this.map = new Map();
  }
  
  addPlayer(client, player) { // TODO: validate player
    let playerId = client.conn.id;
    this.players[playerId] = player;
    this.map.addPlayer(playerId, player);
  }
  
  removePlayer(client) {
    let playerId = client.conn.id;
    delete this.players[playerId];
    this.map.removePlayer(playerId);
  }
  
  action(client, action) { // TODO: validate action
    let playerId = client.conn.id;
    if (this.players[playerId]) {
      switch (action.type) {
        case 'MOVE': this.map.movePlayer(playerId, action.direction); break;
        case 'SHOOT': this.map.shootPlayer(playerId, action.direction); break;
        default:
          console.error(`unknown action ${client.conn.id} ${action}`);
      }
    }
  }
}

const isNode = new Function("try {return this===global;}catch(e){return false;}");
if (isNode()) {
  module.exports = State;
}