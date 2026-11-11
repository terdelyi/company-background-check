// Preloaded with --import so the script's age and recency checks give the same answer on every run.
const frozen = new Date(process.env.FAKE_NOW).getTime();
if (Number.isNaN(frozen)) {
  throw new Error('FAKE_NOW must be an ISO date');
}

const RealDate = Date;
globalThis.Date = class extends RealDate {
  constructor(...args) {
    if (args.length) {
      super(...args);
    } else {
      super(frozen);
    }
  }

  static now() {
    return frozen;
  }
};
