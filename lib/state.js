/* This is the game state file for pubg.io
 * @author TakLee96 / jiahang_li@outlook.com
 **/

// Constants
const PLAYER_VELOCITY = 30;
const DISPLAY_WIDTH = 1280;
const DISPLAY_HEIGHT = 720;
const FRAME_INTERVAL = 50;

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
  constructor({angles, range, cooldown, damage}) {
    this.angles = angles;
    this.range = range;
    this.cooldown = cooldown;
    this.damage = damage;
  }
}

class Pistol extends Weapon {
  constructor() {
    super({ angles: [ 0 ], range: 300, cooldown: 500, damage: 20 });
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
    this.lastMovement = Date.now();
    this.lastShot = Date.now();
    this.weapon = new Pistol();
  }
  
  canShoot() {
    return Date.now() - this.lastShot > this.weapon.cooldown;
  }
  
  canMove() {
    return Date.now() - this.lastMovement > FRAME_INTERVAL - 10;
  }
}

class MapObject {
  constructor(geometry, x, y) {
    this.geometry = geometry;
    this.x = x;
    this.y = y;
  }
}

function clip(val, min, max) {
  return Math.min(Math.max(val, min), max);
}

function vector_add(va, vb) {
  return { x: va.x + vb.x, y: va.y + vb.y };
}

function vector_sub(va, vb) {
  return { x: va.x - vb.x, y: va.y - vb.y };
}

function vector_dot(va, vb) {
  return va.x * vb.x + va.y * vb.y;
}

function vector_scale(v, scale) {
  return { x: scale * v.x, y: scale * v.y };
}

function vector_norm(v) {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vector_contains(v_from, v_to, v_elem) {
  return vector_dot(vector_sub(v_elem, v_from), vector_sub(v_to, v_elem)) >= 0;
}

function vector_normalize(v) {
  let norm = vector_norm(v);
  if (norm === 0) norm = 1;
  return vector_scale(v, 1/norm);
}

function vector_dist(va, vb) {
  return vector_norm(vector_sub(va, vb));
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
    this.recentShots = null;
  }
  
  addPlayer(playerId, player) {
    let x = Math.random() * this.size.width;
    let y = Math.random() * this.size.height;
    this.players[playerId] = new MapObject(new Player(player), x, y);
  }
  
  movePlayer(playerId, direction) {
    let playerMapObject = this.players[playerId];
    let player = playerMapObject.geometry;
    if (player.canMove()) {
      player.lastMovement = Date.now();
      
      let d_norm = vector_normalize(direction);
      d_norm = vector_scale(d_norm, PLAYER_VELOCITY);
      playerMapObject.x = clip(playerMapObject.x + d_norm.x, 0, this.size.width);
      playerMapObject.y = clip(playerMapObject.y + d_norm.y, 0, this.size.height);
      
      return this.getNeighbors(playerId, playerMapObject).concat([ playerId ]);
    }
    return [];
  }
  
  removePlayer(playerId) {
    delete this.players[playerId];
  }
  
  landShot(neighbor, shot) {
    let A = shot.from;
    let B = shot.to;
    let C = this.players[neighbor];
    let r = C.geometry.size.radius;
    
    // project AC onto AB to obtain AD
    let AC = vector_sub(C, A);
    let AB = vector_sub(B, A);
    let dir_shot = vector_normalize(AB);
    let AD = vector_scale(dir_shot, vector_dot(AB, AC) / vector_norm(AB));
    let D = vector_add(A, AD);
    let h = vector_dist(C, D);
    
    if (h > r) {
      return false;
    }
    
    let intersections = [];
    if (h === r) {
      intersections.push(D);
    } else {
      let scale = Math.sqrt(r * r - h * h);
      let DE = vector_scale(dir_shot, scale);
      let DF = vector_scale(DE, -1);
      let E = vector_add(D, DE);
      let F = vector_add(D, DF);
      intersections.push(E);
      intersections.push(F);
    }
    
    return intersections.filter((P) => vector_contains(A, B, P)).length > 0;
  }
  
  shootPlayer(playerId, direction) {
    let playerMapObject = this.players[playerId];
    let player = playerMapObject.geometry;
    if (player.canShoot()) {
      player.lastShot = Date.now();
      
      let { x, y } = vector_normalize(direction);
      let weapon = player.weapon;
      let shots = weapon.angles
        .map((a) => ({
          x: x * Math.cos(a) - y * Math.sin(a),
          y: x * Math.sin(a) + y * Math.cos(a),
        }))
        .map(vector_normalize)
        .map(({ x, y }) => ({
          from: { x: playerMapObject.x, y: playerMapObject.y },
          direction: { x: x * weapon.range, y: y * weapon.range },
          to: { x: playerMapObject.x + x * weapon.range, y: playerMapObject.y + y * weapon.range },
        }));
      this.recentShots = shots;
      
      let neighbors = this.getNeighbors(playerId, { ...playerMapObject, r: weapon.range });
      for (let neighbor of neighbors) {
        for (let shot of shots) {
          if (this.landShot(neighbor, shot)) {
            this.players[neighbor].geometry.hp = Math.max(0, this.players[neighbor].geometry.hp - weapon.damage);
          }
        }
      }

      neighbors = [];
      for (let shot of shots) {
        neighbors = neighbors.concat(this.getNeighbors(playerId, shot.to))
      }
      neighbors = neighbors.concat(this.getNeighbors(playerId, playerMapObject))
      
      return Array.from(new Set(neighbors)).concat([ playerId ]);
    }
    return [];
  }
  
  getNeighbors(playerId, { x, y, r }) {
    let neighbors = [];
    for (let otherId of Object.keys(this.players)) {
      if (otherId !== playerId) {
        let otherLoc = this.players[otherId];
        if (Math.abs(otherLoc.x - x) < (r || DISPLAY_WIDTH) &&
            Math.abs(otherLoc.y - y) < (r || DISPLAY_HEIGHT)) {
          neighbors.push(otherId);
        }
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
    let affectedNeighbors = [];
    switch (action.type) {
      case 'MOVE':
        affectedNeighbors = this.map.movePlayer(playerId, action.direction);
        break;
      case 'SHOOT':
        affectedNeighbors = this.map.shootPlayer(playerId, action.direction);
        break;
      default:
        console.error(`unknown action ${client.id} ${action}`);
    }
    return affectedNeighbors;
  }
}

const isNode = new Function("try {return this===global;}catch(e){return false;}");
if (isNode()) {
  module.exports = State;
}
