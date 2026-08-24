export type LocalMockAdapter<Result> = Readonly<{
  execute(candidate: unknown): Result
}>

export type ResettableLocalMockAdapter<Result> = LocalMockAdapter<Result> &
  Readonly<{
    reset(): void
  }>
