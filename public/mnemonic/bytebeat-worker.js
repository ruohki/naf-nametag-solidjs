class ByteBeatWorker extends AudioWorkletProcessor {
  constructor(...args) {
    super(...args);
    console.log("init");
    this.code = "t";
    this.bufIdx = 0;
    this.g = Function("t", "c", "return c=" + this.code + ";");
    this.port.onmessage = (event) => {
      this.code = event.data;
      try {
        this.g = Function("t", "c", "return c=" + this.code + ";");
        this.lastCode = this.code;
      } catch (error) {
        this.g = Function("t", "c", "return c=" + this.lastCode + ";");
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

registerProcessor("bytebeat-worker", ByteBeatWorker);
