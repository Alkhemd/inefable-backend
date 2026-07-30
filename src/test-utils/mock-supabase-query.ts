const CHAIN_METHODS = [
  'select',
  'eq',
  'is',
  'insert',
  'update',
  'in',
  'order',
  'limit',
  'single',
] as const;

export type QueryBuilderMock = Record<
  (typeof CHAIN_METHODS)[number],
  jest.Mock
> & {
  then: (onResolved?: unknown, onRejected?: unknown) => Promise<unknown>;
};

// Simula el builder encadenable (`.select().eq().single()`) y a la vez "thenable" de
// PostgREST: cada método de la cadena regresa el mismo objeto, y `await` en cualquier
// punto de la cadena resuelve al `result` fijado, tal como hace el cliente real de Supabase.
export function mockQueryResult(result: unknown): QueryBuilderMock {
  const builder = {} as QueryBuilderMock;
  CHAIN_METHODS.forEach((method) => {
    builder[method] = jest.fn(() => builder);
  });
  builder.then = (onResolved, onRejected) =>
    Promise.resolve(result).then(
      onResolved as () => unknown,
      onRejected as () => never,
    );
  return builder;
}
