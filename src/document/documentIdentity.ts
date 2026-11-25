// Identity belongs to the immutable parsed source, not a reorderable tab index.
const revisions = new WeakMap<object, number>();
let sequence = 0;
export function documentSnapshotId(source: object): number {
  let id = revisions.get(source);
  if (id === undefined) {
    id = ++sequence;
    revisions.set(source, id);
  }
  return id;
}
