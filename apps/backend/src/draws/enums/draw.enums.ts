export enum DrawFormatValue {
  SINGLE_ELIM = 'single_elim',
  GROUP_THEN_ELIM = 'group_then_elim',
}

export enum DrawStatusValue {
  DRAFT = 'DRAFT',
  DRAWN = 'DRAWN',
  FROZEN = 'FROZEN',
}

export enum DrawOperationTypeValue {
  SEED_UPDATE = 'SEED_UPDATE',
  EXECUTE = 'EXECUTE',
  SWAP = 'SWAP',
  FREEZE = 'FREEZE',
  REDRAW = 'REDRAW',
}
