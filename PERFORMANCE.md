# Git Index Performance Notes (Windows vs. macOS)

Analysis of why `git read-tree` / `git update-index` in `commit-folder-to-ref-src-dir.sh`
are nearly instant on macOS but take many seconds on Windows, and what to do about it.

## Why it's slow on Windows

The current loop spawns **~4 processes per file**: `git hash-object -w`, `git update-index
--cacheinfo`, `basename`, and the `$(...)` command substitution wrapping them.

Three costs stack up on Windows that are nearly free on macOS:

1. **Process creation.** `CreateProcess` is roughly 10–50× more expensive than `fork`/`exec`,
   and MSYS2's fork emulation under Git Bash makes `$(...)` worse still. Every `git`
   invocation also re-reads config, discovers the repo, and loads the index.
2. **O(N²) index I/O.** `git update-index` is not incremental. Each invocation reads the
   *entire* index, applies one change, writes the *entire* index to `index.lock`, then
   renames. For N files you rewrite the index N times. The per-invocation lock create +
   rename is the part NTFS handles poorly.
3. **Antivirus.** Defender real-time scanning inspects every `index.lock` create/rename and
   every loose object written under `.git/objects` — often 5–20 ms per file operation. This
   is frequently the single largest factor.

"Many seconds" for a few hundred files is exactly the expected shape.

## Main fix: batch everything through `--index-info`

`git update-index --index-info` reads a stream of index entries on stdin and applies them in
**one** index read/write. Its format also expresses deletions natively:

```
<mode> SP <sha1> TAB <path>          # add/replace
000000 SP 0000...0000 TAB <path>     # delete  (mode 0 / null sha)
```

Adds and removals go in a single stream: one process, one index rewrite. N index rewrites
collapse to 1.

`--force-remove` is the other correct way to delete an entry whose file is absent from the
worktree (`--remove` refuses while the file still exists), but `--index-info` lets you mix
both kinds of operation in one pass.

Pair it with `git hash-object -w --stdin-paths`, which takes a newline-separated list of
paths on stdin and emits one SHA per line — N `hash-object` spawns become 1. Zip the SHAs
back against the paths in shell or awk and pipe into `--index-info`. Net: ~2 processes total
instead of ~4N.

Simpler variant with the same win and less rework: since Git 2.0, `update-index --add
--cacheinfo` accepts **multiple** triples per invocation. Accumulate them in an array and
pass them all at once.

## Better: skip the per-file index churn entirely

Since the script replaces the whole `src/` subtree wholesale, individual index entries don't
need touching at all:

- Build the new subtree independently — either `git mktree` fed `mode type sha\tname` lines
  (one process, no index involved), or a scratch index you `write-tree`.
- Splice it in: `git read-tree --prefix=src/ <subtree-sha>` into the main temp index (valid
  because the prefix was just emptied).

Constant process count regardless of file count.

**The ceiling is `git fast-import`.** A single process consumes a stream containing
`filedeleteall`/`filedelete`, `filemodify` with inline blob data, the commit, and the ref
update. It writes one *packfile* instead of thousands of loose objects, and needs no index,
no `write-tree`, no `commit-tree`, no `update-ref`. For a script whose entire job is
"snapshot this directory into a ref," it's the natural plumbing choice.

## Does reusing an index file help?

**Yes, but not with the current commands.** `--cacheinfo` and `--index-info` never look at
the worktree — the content is already hashed by hand, so there's nothing for a stat cache to
short-circuit. Reusing an index buys nothing as written.

The win appears when git decides what changed. With a persistent index and `git update-index
--add -z --stdin` (paths, not cacheinfo) or `git add`, git compares each path's cached stat
data — mtime, ctime, size, dev/ino, mode — against the index entry. On a match it **skips
reading and hashing the file entirely**. Cost per unchanged file drops from "read every byte
+ SHA-1" to a single `lstat`. For a large, mostly-static `src/`, that's a very large
difference.

Caveats:

- One `lstat` per file regardless. That syscall is comparatively expensive on Windows, which
  is why `core.fscache` (on by default in Git for Windows) and the built-in FSMonitor
  (`core.fsmonitor = true`, Git 2.36+) exist. FSMonitor is the big one for repeated runs — it
  skips the directory walk for untouched paths.
- Git for Windows has no meaningful inode numbers, so it leans harder on size + mtime.
- **Racy timestamps:** files whose mtime equals the index's own mtime are treated as suspect
  and re-hashed. Generated files landing in the same second as the index write lose the
  optimization.
- A reused index preserves the **cache-tree**, so `git write-tree` only recomputes trees along
  invalidated paths instead of the whole hierarchy.

Tradeoff: a persistent index means owning its invalidation. If anything else touches the repo,
or the index goes stale/corrupt, the result is wrong rather than slow. Keep it at a well-known
path (e.g. `.git/index-snapshot`) and treat it as disposable — on any anomaly, delete and
rebuild from the tree.

## Incremental diff vs. bulk remove-then-re-add

Remove-all-then-add-all is not itself expensive — as a single `--index-info` stream it's one
index rewrite either way. The quadratic cost comes from per-file process spawning, not the
remove/add semantics.

Computing the delta by hand pays off in one place: it lets you skip `hash-object` for
unchanged files. But that is precisely the stat-cache logic git already implements, better
tested, via a persistent index. Prefer reusing the index over hand-rolling the comparison.

The one case for doing it yourself: the files are generated externally and you have
out-of-band knowledge of what changed (a manifest, a build log). Then feeding just those
entries beats any stat heuristic.

## Other plumbing-level knobs

Config, most impactful first on Windows:

- `index.skipHash = true` (Git 2.40+) — skips the trailing SHA-1 over the whole index on every
  write. Measurable on large indexes, and this script rewrites the index a lot.
- `index.version = 4` — path-prefix compression; smaller index means less to read and write.
- `core.fscache = true`, `core.fsmonitor = true`, `core.untrackedCache = true`.
  `feature.manyFiles = true` sets several of these together.
- `core.preloadIndex = true` (default on) parallelizes the stat pass.
- `GIT_OPTIONAL_LOCKS=0` prevents incidental index refreshes/writes from read-only commands.

Script-level:

- Replace `$(basename $file)` with `${file##*/}` — pure shell, no process. Same for any other
  subshell in the loop.
- Quote `"$file"` in `hash-object -w $file`, and quote `$FILE_HASH`. Unquoted paths break on
  spaces, which Windows paths have constantly. (Correctness, not performance, but it bites
  there first.)
- `mktemp` puts the index in `%TEMP%`, a directory AV watches aggressively and which may be on
  a different volume. Put the temp index inside `.git/` instead.
- Loose objects mean thousands of small NTFS file creates. If staying with `hash-object`, run
  `git gc` / `git repack` periodically — or move to `fast-import` and get a packfile for free.
- `rm -f $TEMP_INDEX_FILE` only runs on the success paths; a failure between `read-tree` and
  the end leaks the file. A `trap ... EXIT` covers all exits.

## Recommended ordering

1. AV exclusions for the repo and temp dir — zero code, often the largest single factor.
2. Batch to one `hash-object --stdin-paths` + one `update-index --index-info` — removes the
   O(N²) and the spawn storm.
3. Set `index.skipHash`, `index.version=4`, `feature.manyFiles`.
4. Persistent index + path-based `update-index --add` so unchanged files are never read.
5. If still not fast enough, rewrite as a single `git fast-import` stream.

Steps 1–2 should get to "unnoticeable."
