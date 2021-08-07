const { AlgoLogger: AlgoLogger } = require('./index.js')


class Poller {

  every(nSeconds) {
    this.interval = this._convertToMilliseconds(nSeconds);

    return new Iterator(this)
  }

  _convertToMilliseconds(nSeconds) {
    return nSeconds * 1000;
  }

}


class Iterator {
  constructor(poller) {
    this.poller = poller;
  }

  for(nIterations) {
    this.iterations = nIterations;

    return new Runner(this)
  }
}

class Runner {
  constructor(iterator) {
    this.iterator = iterator
  }


  run(fn) {
    let interval = this.iterator.poller.interval;
    let iterations = this.iterator.iterations;

    let result;
    if (iterations === -1) {
      result = this._runWithInfiniteAttempts(interval, fn)
    } else {
      result = this._runWithFiniteAttempts(interval, iterations, fn)
    }

    return new Promise(result);
  }

  _runWithInfiniteAttempts(interval, fn) {


    // console.log(interval);
    // let result = setInterval(fn, interval);
    // console.log(result);
  }

  _runWithFiniteAttempts(interval, iterations, fn) {
    let attempts = 0;

    const executePoll = (resolve, reject) => {
      const result = fn();
      attempts++;

      if (maxAttempts && attempts === maxAttempts) {
        return new Error('Exceeded max attempts');
      } else {
        setInterval(fn, interval);
      }
    };

    return new Promise(executePoll)
  }
}


const hi = () => {
  console.log("Hello!");
}

Poll = new Poller();
Poll.every(10).for(-1).run(hi)

// Promise.resolve(Poll.hi().catch(console.log)).then( (res) => {
//   console.log(res);
// })
