abstract class AnyChainHeadState {
  public newHeadCallback?: () => void;
}

export class PrimaryChainHeadState extends AnyChainHeadState {
  public constructor(
    public lastFinalizedBlockNumber: number,
  ) {
    super();
  }
}

export class ParachainHeadState extends AnyChainHeadState {
}
