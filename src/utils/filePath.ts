/** Compare absolute desktop paths without changing the path used for I/O. */
export function sameFilePath(left: string | null | undefined, right: string): boolean {
  if (!left) return false;
  // Drive and UNC paths use Windows rules; POSIX filenames retain their case
  // and backslashes (a legal filename character on Linux).
  const windows = /^(?:[a-z]:[\\/]|\\\\)/i;
  if (windows.test(left) && windows.test(right)) {
    return left.replace(/\\/g, "/").toLowerCase() === right.replace(/\\/g, "/").toLowerCase();
  }
  return left === right;
}
