// 元素
var container = document.getElementById('game');
var canvas = document.getElementById('canvas');
var ctx = canvas.getContext('2d');
/**
* 游戏相关配置
* @type {Object}
*/
var CONFIG = {
  status: 'start', // 游戏开始默认为开始中
  level: 1, // 游戏默认等级
  totalLevel: 6, // 总共6关
  numPerLine: 7, // 游戏默认每行多少个怪兽
  canvasPadding: 30, // 默认画布的间隔
  bulletSize: 10, // 默认子弹长度
  bulletSpeed: 10, // 默认子弹的移动速度
  enemySpeed: 2, // 默认敌人移动距离
  enemySize: 50, // 默认敌人的尺寸
  enemyGap: 10,  // 默认敌人之间的间距
  enemyIcon: './img/enemy.png', // 怪兽的图像
  enemyBoomIcon: './img/boom.png', // 怪兽死亡的图像
  enemyDirection: 'right', // 默认敌人一开始往右移动
  planeSpeed: 5, // 默认飞机每一步移动的距离
  planeSize: {
    width: 60,
    height: 100
  }, // 默认飞机的尺寸,
  planeIcon: './img/plane.png',
};
// 判断是否有 requestAnimationFrame 方法，如果有则模拟实现
window.requestAnimFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 30);
  };
// 判断是否有cancelAnimationFrame 方法，如果没有则模拟实现
window.cancelAnimFrame = window.cancelAnimationFrame ||
  Window.webkitCancelAnimationFrame ||
  window.mozCancelAnimationFrame ||
  window.msCancelAnimationFrame ||
  window.oCancelAnimationFrame ||
  function (id) {
    //为了使setTimteout的尽可能的接近每秒60帧的效果  
    window.clearTimeout(id);
  }
/**
 * 整个游戏对象
 */
var GAME = {
  /**
   * 初始化函数,这个函数只执行一次
   * @param  {object} opts 
   * @return {[type]}      [description]
   */
  init: function (opts) {
    this.status = CONFIG.status;
    this.level = CONFIG.level;
    this.maxLevel = CONFIG.totalLevel;
    this.game = document.getElementById('game');
    this.leveldom = document.querySelector('.js-level');
    this.scoledom = document.querySelector('.js-scole');
    //js-nextlevel
    this.nextlevel = document.querySelector('.js-nextlevel');

    this.bindEvent();
  },
  bindEvent: function () {
    var self = this;
    this.game.onclick = function (e) {
      var tg = e.target;
      if (tg.className.indexOf('js-play') > -1 || tg.className.indexOf('js-next') > -1) {
        self.play();
      } else if (tg.className.indexOf('js-replay') > -1) {
        self.level = 1;
        Grade.reset();
        self.play();
      }
    }

  },
  /**
   * 更新游戏状态，分别有以下几种状态：
   * start  游戏前
   * playing 游戏中
   * failed 游戏失败
   * success 游戏成功
   * all-success 游戏通过
   * stop 游戏暂停（可选）
   */
  setStatus: function (status) {
    this.status = status;
    container.setAttribute("data-status", status);

    if (status == 'success') {
      this.addLevel();
      this.nextlevel.innerHTML = '下一个level: ' + this.level;
    }
    if (status == 'failed') {
      this.scoledom.innerHTML = Grade.grade;
    }

  },
  play: function () {
    this.setStatus('playing');
    Canvas.init();
  },
  addLevel: function () {
    this.level++;
    if (this.level > this.maxLevel) {
      this.setStatus('all-success');
    } else {
      this.leveldom.innerHTML = "当前Level: " + this.level;
    }

  }
};


// 初始化
GAME.init();

Array.prototype.delete = function (obj) {
  for (var i = 0; i < this.length; i++) {
    if (this[i] == obj) {
      this.splice(i, 1);
      break;
    }
  }
}
/*
* 整个画布对象
*/
var Canvas = {
  can: document.getElementById('canvas'),
  ctx: document.getElementById('canvas').getContext('2d'),
  mons: [],// 画布上的怪兽对象的集合
  buls: [], // 画布上子弹对象的集合
  plane: null, //画布上的飞机对象
  npl: CONFIG.numPerLine, //每行的怪兽
  suctimer: null,
  failtimer: null,
  init: function () {
    this.addGrade();
    this.addMonster(this.npl * GAME.level);
    this.addPlane();
  },

  // 碰撞检测，子弹移动的时候进行碰撞检测
  isTouch: function (obj, fn) {
    for (var i = 0, len = this.mons.length; i < len; i++) {
      var mon = this.mons[i];
      if (!(mon.loc.x + mon.loc.w < obj.loc.x) && !(obj.loc.x + obj.loc.w < mon.loc.x)
        && !(mon.loc.y + mon.loc.h < obj.loc.y)
        && !(obj.loc.y + obj.loc.h < mon.loc.y)) {
        //如果子弹和任一怪兽碰撞了碰撞了

        // 添加分数
        Grade.add();
        //告诉子弹 它碰撞了 怪兽
        obj.setDeath();
        //告诉 怪兽它碰撞了子弹
        mon.setDeath();

        //删除画布上怪兽对象集合中 对应的怪兽
        this.mons.delete(mon);
        //删除画布上子弹对象集合中 对应的子弹
        this.buls.delete(obj);
        console.log(this.mons.length)

        if (this.mons.length == 0) {
          var _self = this;
          clearTimeout(this.suctimer);
          this.suctimer = setTimeout(function () {
            _self.clearAll();
            GAME.setStatus('success');
          }, 400)

        }
        // 停止检索
        return true;
      }
    }
    return false;
  },
  // 怪兽整体是否碰撞了边缘
  isMonsEdge: function (mon) {
    var mincol = this.npl - 1, maxcol = 0, maxrow = 0, mincolmon, maxcolmon, maxrowmon;
    var monx = mon.loc.x, mony = mon.loc.y, monw = mon.loc.w, monh = mon.loc.h, monmx = mon.loc.marX, monid = mon.id, moncol = -1, monrow = -1;
    for (var i = 0, len = this.mons.length; i < len; i++) {
      var col = this.mons[i].id % this.npl;
      var row = Math.floor(this.mons[i].id / this.npl)
      mincol = col < mincol ? col : mincol;
      maxcol = col > maxcol ? col : maxcol;
      maxrow = row > maxrow ? row : maxrow;
      if (this.mons[i].id == monid) {
        moncol = col;
        monrow = row;
      }
    }
    var boolX = false, boolY = false;
    if (moncol != -1 && monrow != -1 && len) {
      var monsl = monx - (moncol - mincol) * (monw + monmx);
      var monsr = monx + (maxcol - moncol) * (monw + monmx) + monw;
      var monsb = mony + (maxrow - monrow) * (monh) + monh;
      if (monsl < mon.area.l || monsr > mon.area.r) {
        boolX = true;
      }
      if (monsb > mon.area.b) {
        boolY = true;
      }
    }
    return { boolX: boolX, boolY: boolY }
  },

  // 如果游戏死亡，或者成功，清空所有画布和对象
  clearAll: function () {
    clearTimeout(this.suctimer);
    clearTimeout(this.failtimer);
    for (var i = 0, len = this.mons.length; i < len; i++) {
      this.mons[i].setDeath();
      this.mons[i].stop();
    }
    for (var i = 0, len = this.buls.length; i < len; i++) {
      this.buls[i].setDeath();
      this.buls[i].stop();
    }
    if (this.plane) {
      this.plane.setDeath();
      this.plane.stop();
      this.plane.removeEvent();
      this.mons = [];
      this.buls = [];
      this.plane = null;
      this.ctx.clearRect(0, 0, this.can.width, this.can.height);
    }
  },

  // 画布上新增飞机
  addPlane: function () {
    var l = CONFIG.canvasPadding, r = 700 - l, b = 600 - l;
    var w = CONFIG.planeSize.width, h = CONFIG.planeSize.height, x = (r - l) / 2, y = b - h, t = y;
    var o = {  // 初始化的飞机对象对应参数
      loc: { x: x, y: y, w: w, h: h },
      area: { l: l, t: t, r: r, b: b },
      disX: CONFIG.planeSpeed,
      disY: 0,
      dirX: 1,
      dirY: 1,
      src: CONFIG.planeIcon
    };
    this.plane = new Plane(o);
  },
  // 画布上新增 子弹
  addBullet: function (x, y) {

    var o = { //初始化的子弹对象对应参数，再创建的时候，xy 会再改
      loc: { x: x, y: y, w: 1, h: CONFIG.bulletSize },
      area: { l: 30, t: 0, w: 640, h: 470 },
      disX: 0,
      disY: CONFIG.bulletSpeed,
      dirX: 1,
      dirY: -1
    };
    this.buls.push(new Bullet(o));
  },
  //删除子弹
  delBullet: function (obj) {
    this.buls.delete(obj);
  },
  cloneO: function (obj) {
    var o = {};
    for (var name in obj) {
      if (typeof obj[name] == 'object') {
        var c = this.cloneO(obj[name]);
        o[name] = c;
      } else {
        o[name] = obj[name];
      }
    }
    return o;
  },
  // 画布上新增怪兽
  addMonster: function (num) {
    var l = CONFIG.canvasPadding, t = l, r = 700 - l, b = 600 - t - CONFIG.planeSize.height;
    var w = CONFIG.enemySize, h = CONFIG.enemySize, x = l, y = t;
    var o = null;
    for (var i = 0; i < num; i++) {
      o = {// 初始化的怪兽对象对应参数, 在创建的时候也会修改x,y
        loc: { x: x, y: y, w: w, h: w, marX: CONFIG.enemyGap },
        area: { l: l, t: t, r: r, b: b },
        disX: CONFIG.enemySpeed,
        disY: h,
        dirX: CONFIG.enemyDirection == 'right' ? 1 : -1,
        dirY: 1,
        liveSrc: CONFIG.enemyIcon,
        deadSrc: CONFIG.enemyBoomIcon,
        deadTimes: 3, //死亡图像持续的帧数
        id: i,
      };
      o.loc.x = o.area.l + (i % this.npl) * (o.loc.marX + o.loc.w);
      o.loc.y = o.area.t + Math.floor(i / this.npl) * o.loc.h;
      var mon = new Monster(o)
      this.mons.push(mon);
      mon.move();
    }
  },
  addGrade: function () {
    Grade.init();
  }
}


// 移动的物体
function moveObject(o) {
  this.loc = o.loc; // 移动的物体一定有自己的位置
  this.area = o.area; //移动物体有自己可移动的范围
  this.disX = o.disX; //移动的物体会有每次移动的距离
  this.disY = o.disY;
  this.dirX = o.dirX; //移动的物体在 每次移动的时候X轴的方向,1是向右，-1向左
  this.dirY = o.dirY; //移动的物体，在每次移动的时候y轴的方向，1向下， -1向上
  this.timer = null; //移动的物体一定有定时器
  this.isDead = false; //自动以移动的物体一定可以判断是否死亡，是否可以继续移动
}
//移动的物体可以设置在正常情况下移动的位置
moveObject.prototype.setNormalPos = function () {
  this.loc.x += this.disX * this.dirX;
  this.loc.y += this.disY * this.dirY;
}
//移动的物体可以在Canvas 中画出图形
moveObject.prototype.drawImage = function (img) {
  var _self = this;
  if (!img) return
  if (img.complete) {
    Canvas.ctx.drawImage(img, _self.loc.x, _self.loc.y, _self.loc.w, _self.loc.h);
  } else {
    img.onload = function () {
      Canvas.ctx.drawImage(img, _self.loc.x, _self.loc.y, _self.loc.w, _self.loc.h);
    }
  }
}

//移动的物体可以清除在Canvas中的图样
moveObject.prototype.clear = function () {
  Canvas.ctx.clearRect(this.loc.x, this.loc.y, this.loc.w, this.loc.h);
}
//移动的物体可以停止定时器
moveObject.prototype.stop = function () {
  cancelAnimFrame(this.timer)
}
// 移动的物体可以设置是否死亡 以停止运动
moveObject.prototype.setDeath = function () {
  this.isDead = true;
}


// 继承的函数
function inheritFn(childTy, parentTy) {
  //新建一个对象，obj={}, obj.prototype = parentTy;
  var obj = Object.create(parentTy.prototype);
  obj.constructor = childTy;
  childTy.prototype = obj;
}

/*
* 飞机对象
*/
function Plane(o) {
  moveObject.call(this, o);

  this.img = new Image();
  this.img.src = o.src;
  this.keyCodes = { left: false, right: false, space: false };//为了让移动没有延迟的感觉，也为了能同时让发射和移动响应，不通过监听移动，通过记录键盘事件，request移动

  this.bindEvent();
  this.setPos();
  this.draw();
}
inheritFn(Plane, moveObject);

Plane.prototype.shoot = function () {
  Canvas.addBullet(this.loc.x + this.loc.w / 2, this.loc.y);
}
Plane.prototype.draw = function () {
  if (this.isDead) return;
  this.drawImage(this.img);
}
Plane.prototype.setPos = function () {

  if (this.keyCodes.space && Canvas.plane) {
    // this.shoot();
  }
  if (this.keyCodes.left && !this.keyCodes.right || !this.keyCodes.left && this.keyCodes.right) {
    this.clear();
    this.loc.x += this.disX * this.dirX;
    if (this.loc.x < this.area.l) {
      this.loc.x = this.area.l;
    } else if (this.loc.x + this.loc.w > this.area.r) {
      this.loc.x = this.area.r - this.loc.w;
    }
    this.draw();
  }
  this.timer = requestAnimFrame(this.setPos.bind(this))
}
Plane.prototype.removeEvent = function () {
  document.onkeydown = null;
  document.onkeyup = null;
}
Plane.prototype.bindEvent = function () {
  var _self = this;
  // 监听键盘事件
  document.onkeydown = function (e) {
    // 获取被按下的键值 (兼容写法)
    var key = e.keyCode || e.which || e.charCode;

    if (key == 32) {
      _self.keyCodes.space = true;
      _self.shoot();
    }
    if (key == 37) {
      _self.keyCodes.left = true;
      _self.keyCodes.space = false;
      _self.dirX = -1;
    }
    if (key == 39) {
      _self.keyCodes.right = true;
      _self.keyCodes.space = false;
      _self.dirX = 1;
    }
  };
  document.onkeyup = function (e) {
    // 获取被按下的键值 (兼容写法)
    var key = e.keyCode || e.which || e.charCode;
    if (key == 32) {
      _self.keyCodes.space = false;
    }
    if (key == 37) {
      _self.keyCodes.left = false;
    }
    if (key == 39) {
      _self.keyCodes.right = false;
    }
  };
}

// 子弹对象
function Bullet(o) {
  moveObject.call(this, o);
  this.move();
}
inheritFn(Bullet, moveObject);

Bullet.prototype.draw = function () {
  Canvas.ctx.beginPath();
  Canvas.ctx.fillStyle = "#fff";
  Canvas.ctx.fillRect(this.loc.x, this.loc.y, this.loc.w, this.loc.h);
}
Bullet.prototype.move = function () {
  //飞出区域
  if (this.isDead) {
    this.stop();
    this.clear();
    return;
  }
  if (this.loc.y < this.area.t) {
    this.clear();
    Canvas.delBullet(this);
    return;
  }
  // 在改变位置之前，先清除之前位置的图像
  this.clear()
  //改变位置
  this.setNormalPos();
  //画出位置子弹
  this.draw();

  //碰撞检测,碰撞了停止移动，并消失
  if (Canvas.isTouch(this)) {
    this.stop();
    this.clear();
    return;
  }
  this.timer = requestAnimFrame(this.move.bind(this));
}





// 怪兽对象
function Monster(o) {

  moveObject.call(this, o);

  this.id = o.id; // 此怪兽出生排在第几个的id

  this.deadTimes = o.deadTimes; //爆炸图像持续三帧
  this.deadTime = 0; //目前爆炸图像持续了几帧

  this.liveImg = new Image();
  this.liveImg.src = o.liveSrc;
  this.deadImg = new Image();
  this.deadImg.src = o.deadSrc;

}
inheritFn(Monster, moveObject);
Monster.prototype.move = function () {

  //在移动前清除怪兽区域
  this.clear();
  if (this.isDead) {
    this.deadTime++;
  }
  if (this.deadTime > this.deadTimes) {
    //爆炸图像持续了三次后，删除怪兽
    return;
  }
  //计算怪兽 方向位置
  this.loc.x += this.dirX * this.disX;

  // 查看位置是否碰到画布边界
  var obj = Canvas.isMonsEdge(this);
  if (obj.boolX && !obj.boolY) {
    this.dirX *= -1;
    this.loc.x += this.dirX * this.disX;
    this.loc.y += 50;
  }
  // 在画布上对应位置画出图片画出
  this.draw();
  if (obj.boolY) {
    clearTimeout(Canvas.failtimer);
    Canvas.failtimer = setTimeout(function () {
      Canvas.clearAll();
      GAME.setStatus('failed');
    }, 300)
    return;
  }

  // 再次进行运动
  this.timer = requestAnimFrame(this.move.bind(this));

}

Monster.prototype.draw = function () {
  if (this.isDead) {
    this.drawImage(this.deadImg);
  } else {
    this.drawImage(this.liveImg);
  }
}

var Grade = {
  grade: 0,
  init: function () {
    this.draw();
  },
  reset: function () {
    this.grade = 0;
    this.draw();
  },
  add: function () {
    this.grade++;
    this.draw();
  },
  draw: function () {
    Canvas.ctx.clearRect(0, 0, 100, 30);
    Canvas.ctx.font = '18px';
    Canvas.ctx.fillStyle = "#fff";
    Canvas.ctx.fillText('分数：' + this.grade, 20, 20);
  }
}