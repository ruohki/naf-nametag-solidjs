/*** Based on jibniz by flupe: https://github.com/flupe/jibniz
          --- (c) Copyright 2021  - MIT License ---
***/

class Editor extends jibniz.Console {
  constructor(canvas, audio, query) {
    super(canvas, audio);

    // initial mode
    this.mode = "TYX";

    this.changeProgram(query);
  }

  step() {
    super.step();
  }

  install(program) {
    this._program = program;
    super.install(program);
  }

  changeProgram(code) {
    this.reset();
    this.install(new jibniz.Program(code));
  }

  reset() {
    super.reset();
    if (this._program) super.install(this._program);
  }
}

AFRAME.registerComponent("ibniz", {
  ibniz: null,
  schema: {
    code: { type: "string", default: "" },
    geo: { type: "number", defaul: 0 },
  },
  init: function () {
    var el = this.el;

    var canvas = document.createElement("canvas");
    el.appendChild(canvas);
    el.setAttribute("material", "src", canvas);
    el.setAttribute("material", "displacementMap", canvas);

    el.setAttribute(
      "resonance-audio-src",
      "position",
      this.el.getAttribute("position")
    );

    var audio = el;
    this.ibniz = new Editor(canvas, audio, "");
    this.ibniz.init().then(() => {
      this.ibniz.run();
    });

    this.el.addEventListener("superkeyboardchange", () => {
      let code = el.childNodes[1].components["super-keyboard"].data.value;

      switch (code) {
        case "666":
          this.el.parentNode.removeChild(this.el);
          break;
        case "660":
          this.el.setAttribute("ibniz", "geo", 0);
          break;
        case "661":
          this.el.setAttribute("ibniz", "geo", 1);
          break;
        case "662":
          this.el.setAttribute("ibniz", "geo", 2);
          break;
        case "663":
          this.el.setAttribute("ibniz", "geo", 3);
          break;
        case "664":
          this.el.setAttribute("ibniz", "geo", 4);
          break;
        case "665":
          this.el.setAttribute("ibniz", "geo", 5);
          break;

        default:
          this.el.setAttribute("ibniz", "code", code);
          break;
      }
    });
  },
  update: function () {
    var data = this.data;
    var el = this.el;
    var geo = data.geo;
    var resonanceRoom = document.querySelector("a-resonance-audio-room");

    el.setAttribute("resonance-audio-src", "room", resonanceRoom);

    el.setAttribute(
      "resonance-audio-src",
      "position",
      this.el.getAttribute("position")
    );

    this.el.setAttribute("text", "value", data.code);

    switch (geo) {
      case 0:
        el.setAttribute("geometry", "primitive", "cone");
        break;
      case 1:
        el.setAttribute("geometry", "primitive", "box");
        break;
      case 2:
        el.setAttribute("geometry", "primitive", "plane");
        break;
      case 3:
        el.setAttribute("geometry", "primitive", "torus");
        break;
      case 4:
        el.setAttribute("geometry", "primitive", "dodecahedron");
        break;
      case 5:
        el.setAttribute("geometry", "primitive", "octahedron");
        break;
      default:
        break;
    }
    this.ibniz.changeProgram(data.code);
  },
});

AFRAME.registerComponent("ibniz-keyboard", {
  dependencies: ["super-keyboard"],
  init: function () {
    var model = {
      wrapCount: 35,
      inputOffsetY: 0.003,
      inputOffsetX: 0,
      img: "sk-basic.png",
      layout: [
        { key: "Insert", x: 0.062, y: 0.005, w: 0.869, h: 0.129 },
        { key: "0", x: 0.066, y: 0.243, w: 0.048, h: 0.092 },
        { key: "1", x: 0.116, y: 0.243, w: 0.048, h: 0.092 },
        { key: "2", x: 0.166, y: 0.243, w: 0.048, h: 0.092 },
        { key: "3", x: 0.215, y: 0.243, w: 0.05, h: 0.092 },
        { key: "4", x: 0.266, y: 0.243, w: 0.049, h: 0.092 },
        { key: "5", x: 0.315, y: 0.243, w: 0.048, h: 0.092 },
        { key: "6", x: 0.366, y: 0.243, w: 0.048, h: 0.092 },
        { key: "7", x: 0.417, y: 0.244, w: 0.049, h: 0.092 },
        { key: "8", x: 0.467, y: 0.244, w: 0.049, h: 0.092 },
        { key: "9", x: 0.519, y: 0.244, w: 0.049, h: 0.092 },
        { key: "A", x: 0.567, y: 0.244, w: 0.051, h: 0.092 },
        { key: "B", x: 0.62, y: 0.244, w: 0.049, h: 0.092 },
        { key: "C", x: 0.671, y: 0.244, w: 0.049, h: 0.092 },
        { key: "D", x: 0.722, y: 0.244, w: 0.05, h: 0.092 },
        { key: "E", x: 0.774, y: 0.243, w: 0.048, h: 0.092 },
        { key: "F", x: 0.824, y: 0.243, w: 0.048, h: 0.092 },
        { key: ".", x: 0.029, y: 0.394, w: 0.051, h: 0.099 },
        { key: "+", x: 0.082, y: 0.394, w: 0.052, h: 0.099 },
        { key: "-", x: 0.134, y: 0.394, w: 0.053, h: 0.099 },
        { key: "*", x: 0.187, y: 0.394, w: 0.052, h: 0.099 },
        { key: "/", x: 0.241, y: 0.394, w: 0.052, h: 0.099 },
        { key: "%", x: 0.294, y: 0.394, w: 0.051, h: 0.099 },
        { key: "q", x: 0.347, y: 0.394, w: 0.052, h: 0.099 },
        { key: "s", x: 0.401, y: 0.396, w: 0.052, h: 0.099 },
        { key: "a", x: 0.454, y: 0.396, w: 0.053, h: 0.099 },
        { key: "<", x: 0.509, y: 0.396, w: 0.052, h: 0.099 },
        { key: ">", x: 0.561, y: 0.396, w: 0.054, h: 0.099 },
        { key: "=", x: 0.617, y: 0.396, w: 0.054, h: 0.099 },
        { key: "&", x: 0.67, y: 0.396, w: 0.052, h: 0.099 },
        { key: "|", x: 0.725, y: 0.395, w: 0.052, h: 0.1 },
        { key: "r", x: 0.78, y: 0.394, w: 0.051, h: 0.099 },
        { key: "l", x: 0.833, y: 0.394, w: 0.052, h: 0.099 },
        { key: "~", x: 0.884, y: 0.394, w: 0.053, h: 0.099 },
        { key: "d", x: 0.029, y: 0.554, w: 0.051, h: 0.099 },
        { key: "p", x: 0.082, y: 0.554, w: 0.052, h: 0.099 },
        { key: "v", x: 0.187, y: 0.554, w: 0.052, h: 0.099 },
        { key: "x", x: 0.134, y: 0.554, w: 0.053, h: 0.099 },
        { key: "(", x: 0.241, y: 0.554, w: 0.052, h: 0.099 },
        { key: ")", x: 0.294, y: 0.554, w: 0.051, h: 0.099 },
        { key: "{", x: 0.347, y: 0.554, w: 0.052, h: 0.099 },
        { key: "}", x: 0.401, y: 0.556, w: 0.052, h: 0.099 },
        { key: "V", x: 0.454, y: 0.556, w: 0.053, h: 0.099 },
        { key: "@", x: 0.509, y: 0.556, w: 0.052, h: 0.099 },
        { key: "!", x: 0.561, y: 0.556, w: 0.054, h: 0.099 },
        { key: "R", x: 0.617, y: 0.556, w: 0.054, h: 0.099 },
        { key: "P", x: 0.67, y: 0.556, w: 0.052, h: 0.099 },
        { key: "U", x: 0.725, y: 0.556, w: 0.052, h: 0.099 },
        { key: "G", x: 0.78, y: 0.554, w: 0.051, h: 0.099 },
        { key: "$", x: 0.833, y: 0.555, w: 0.052, h: 0.098 },
        { key: "^", x: 0.884, y: 0.554, w: 0.053, h: 0.099 },
        { key: "X", x: 0.029, y: 0.703, w: 0.051, h: 0.099 },
        { key: "i", x: 0.082, y: 0.703, w: 0.052, h: 0.099 },
        { key: "j", x: 0.134, y: 0.703, w: 0.053, h: 0.099 },
        { key: "[", x: 0.187, y: 0.703, w: 0.052, h: 0.099 },
        { key: "]", x: 0.241, y: 0.703, w: 0.052, h: 0.099 },
        { key: "J", x: 0.294, y: 0.703, w: 0.051, h: 0.099 },
        { key: "?", x: 0.347, y: 0.703, w: 0.052, h: 0.099 },
        { key: ":", x: 0.401, y: 0.705, w: 0.052, h: 0.099 },
        { key: ";", x: 0.454, y: 0.705, w: 0.053, h: 0.099 },
        { key: ",", x: 0.509, y: 0.705, w: 0.052, h: 0.099 },
        { key: "b", x: 0.561, y: 0.705, w: 0.054, h: 0.099 },
        { key: "q", x: 0.617, y: 0.705, w: 0.054, h: 0.099 },
        { key: "o", x: 0.67, y: 0.705, w: 0.052, h: 0.099 },
        { key: "h", x: 0.725, y: 0.705, w: 0.052, h: 0.099 },
        { key: "M", x: 0.78, y: 0.703, w: 0.051, h: 0.099 },
        { key: "w", x: 0.833, y: 0.703, w: 0.052, h: 0.099 },
        { key: "T", x: 0.884, y: 0.703, w: 0.053, h: 0.099 },
        { key: " ", x: 0.256, y: 0.84, w: 0.415, h: 0.126 },
        { key: "Delete", x: 0.861, y: 0.825, w: 0.078, h: 0.134 },
      ],
    };
    this.el.components["super-keyboard"].addCustomModel("ibniz", model);
    this.el.setAttribute("super-keyboard", {
      imagePath: "./",
      model: "ibniz",
    });
  },
});

AFRAME.registerComponent("canvas-updater", {
  dependencies: ["geometry", "material"],

  tick: function () {
    var el = this.el;
    var material;

    material = el.getObject3D("mesh").material;
    if (!material.map) {
      return;
    }
    material.map.needsUpdate = true;
    material.displacementMap.needsUpdate = true;
  },
});

/* global AFRAME, NAF */
AFRAME.registerComponent("ibniz-persistent", {
  schema: {
    template: { default: "" },
    keyCode: { default: 48 },
  },

  init: function () {
    this.onKeyUp = this.onKeyUp.bind(this);
    document.addEventListener("keyup", this.onKeyUp);
  },

  onKeyUp: function (e) {

    if (this.data.keyCode === e.keyCode || e.keyCode == undefined) {
      const el = document.createElement("a-entity");
      this.el.sceneEl.appendChild(el);
      el.setAttribute("position",this.el.getAttribute("position"));
      el.setAttribute("networked", {
        persistent: true,
        template: this.data.template,
      });
      NAF.utils.getNetworkedEntity(el).then((networkedEl) => {
        document.body.dispatchEvent(
          new CustomEvent("persistentEntityCreated", { detail: { el: el } })
        );
      });
    }
  },
});
