class StackBeatWorker extends AudioWorkletProcessor {
  constructor(...args) {
    super(...args);
    console.log("init");
    this.code = "";
    this.bufIdx = 0;
    this.g = Function("s,R", "s=[R=s];" + this.code + "return s.pop()");
    this.port.onmessage = (event) => {
      this.code = event.data;
      try {
        this.g = Function("s,R", "s=[R=s];" + this.code + "return s.pop()");
        this.lastCode = this.code;
      } catch (error) {
        this.g = Function("s,R", "s=[R=s];" + this.code + "return s.pop()");
      }
    };
  }
  process(inputs, outputs, parameters) {
    const output = outputs[0];
    output.forEach((channel) => {
      // This gives us the actual ArrayBuffer that contains the data

      for (let i = 0; i < channel.length; i++) {
        channel[i] = ((this.g(this.bufIdx) & 255) / 255) * 2 - 1;
        if (i % 6 == 1) {
          this.bufIdx++;
        }
      }
    });
    return true;
  }
}

registerProcessor("stackbeat-worker", StackBeatWorker);
