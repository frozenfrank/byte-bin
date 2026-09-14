# A Note on Performance

If you have just read the [README](./README.md) and run `./init.sh`, you may wonder how a pile of
plumbing commands behaves on a real directory — especially on Windows, where the usual
shell-script tricks are expensive. This page explains where the time goes, what the scripts do
about it, and what was deliberately left on the table.

## This is a proof-of-concept, not a product

The goal of this repo is to show that **arbitrary files can be committed into an arbitrary git ref
without ever touching your working directory or your real index**. Every script is written to make
that idea as legible as possible: one plumbing command at a time, in the order a person would
reason about it.

`commit-folder-to-ref-src-dir.sh` is the clearest example — and it is also the one place where the
naive version was slow enough to matter, so it has been optimized. The optimization turned out to
cost very little readability, which is the interesting part.

## What the core script does now

The whole `src/` replacement is expressed as **one `git update-index --index-info` stream**:

```sh
{
    git ls-files "$PLACEMENT_DIR" |
        awk '{print "000000 0000000000000000000000000000000000000000\t" $0}'

    git hash-object -w --stdin-paths < "$FILE_LIST" |
        paste - <(sed 's|.*/||' "$FILE_LIST") |
        awk -F'\t' -v dir="$PLACEMENT_DIR/" '{print "100644 " $1 "\t" dir $2}'
} | git update-index --index-info
```

`--index-info` reads index entries on stdin and applies them all in **one** index read/write. Its
format expresses deletions natively, so removals and additions ride the same stream:

```
<mode> SP <sha1> TAB <path>          # add/replace
000000 SP 0000...0000 TAB <path>     # delete  (mode 0 / null sha)
```

The first block emits a deletion for every entry currently under `src/`; the second hashes the
whole new folder with a single `git hash-object -w --stdin-paths` (one SHA per line, in input
order), pastes those SHAs back against the file names, and emits the additions. Order matters and
is what makes the mix safe: every old entry is removed before the new ones land.

Net effect versus the original: **~2 processes instead of ~4N, and 1 index rewrite instead of
N+1.**

> The original per-file version is preserved on the **`pre-performance-optimization`** branch:
> `git show pre-performance-optimization:commit-folder-to-ref-src-dir.sh`, or
> `git diff pre-performance-optimization main -- commit-folder-to-ref-src-dir.sh` to see exactly
> what changed. It is worth reading first if you want the unoptimized, one-command-per-concept
> narration.

## What to expect when you run it

* **On macOS and Linux:** instant for the sample data.
* **On Windows (Git Bash / MSYS2):** fast, and no longer scaling with process-spawn cost. What
  still scales with file count is writing one loose object per file into `.git/objects` — thousands
  of small file creates that NTFS and antivirus both dislike.

If a large folder still feels slow on Windows, the two things that help most require no code
changes:

1. Add an antivirus exclusion for this repository folder and your temp directory. This is
   frequently the single largest factor.
2. Use a smaller sample folder — `x/1-alphabet` rather than one of the larger `x/3n-src/*` sets.

---

The rest of this document is background for the curious. None of it is required to use the repo.

## Technical details

### Where the time went

The original loop spawned **~4 processes per file**: `git hash-object -w`, `git update-index
--cacheinfo`, `basename`, and the `$(...)` command substitution wrapping them.

Three costs stacked up on Windows that are nearly free on macOS:

1. **Process creation.** `CreateProcess` is roughly 10–50× more expensive than `fork`/`exec`,
   and MSYS2's fork emulation under Git Bash makes `$(...)` worse still. Every `git`
   invocation also re-reads config, discovers the repo, and loads the index.
2. **O(N²) index I/O.** `git update-index` is not incremental. Each invocation reads the
   *entire* index, applies one change, writes the *entire* index to `index.lock`, then
   renames. For N files you rewrite the index N times. The per-invocation lock create +
   rename is the part NTFS handles poorly.
3. **Antivirus.** Defender real-time scanning inspects every `index.lock` create/rename and
   every loose object written under `.git/objects` — often 5–20 ms per file operation.

"Many seconds for a few hundred files" was exactly the expected shape. Batching removes the first
two costs entirely. The third survives in reduced form: there is no more `index.lock` churn, but
the loose objects are still written one file at a time.

### Details worth knowing about the current implementation

- **`--force-remove` is the other way to delete.** `git update-index --remove` refuses to drop an
  entry while the file still exists in the worktree; `--force-remove` does it anyway. Either works,
  but `--index-info` is what lets deletions and additions share a single pass.
- **A simpler variant exists.** Since Git 2.0, `update-index --add --cacheinfo` accepts *multiple*
  triples per invocation, so accumulating them in an array and passing them all at once gets the
  same single-rewrite win with less restructuring. `--index-info` was chosen because it also
  handles the removals.
- **`find -maxdepth 1 -type f` writes the file list to a temp file** so it can be consumed twice:
  once as `hash-object` input, once as the basename column for `paste`. That also replaced the
  `basename` subshell and the unquoted `$file` expansions, which broke on paths with spaces —
  something Windows paths have constantly.
- **Newlines in filenames would break the stream.** The list is newline-delimited, so a filename
  containing a newline desynchronizes the `paste`. Handling it means `find -print0` plus `-z` on
  the index stream; the sample data has no such paths, so the simpler form was kept.

### Not done: skip the per-file index churn entirely

Since the script replaces the whole `src/` subtree wholesale, individual index entries don't
need touching at all:

- Build the new subtree independently — either `git mktree` fed `mode type sha\tname` lines
  (one process, no index involved), or a scratch index you `write-tree`.
- Splice it in: `git read-tree --prefix=src/ <subtree-sha>` into the main temp index (valid
  because the prefix was just emptied).

Constant process count regardless of file count. With the batching already in place, this is a
smaller win than it sounds — the index is only rewritten once either way.

**The ceiling is `git fast-import`.** A single process consumes a stream containing
`filedeleteall`/`filedelete`, `filemodify` with inline blob data, the commit, and the ref
update. It writes one *packfile* instead of thousands of loose objects, and needs no index,
no `write-tree`, no `commit-tree`, no `update-ref`. For a script whose entire job is
"snapshot this directory into a ref," it's the natural plumbing choice — and it is the one
remaining change that would meaningfully help the loose-object cost on Windows. It is not done
here because the resulting script teaches nothing about the index, which is the point of the repo.

### Not done: does reusing an index file help?

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

### Incremental diff vs. bulk remove-then-re-add

The script still removes everything and re-adds everything, and that is fine: as a single
`--index-info` stream it is one index rewrite either way. The quadratic cost came from per-file
process spawning, not the remove/add semantics.

Computing the delta by hand pays off in one place: it lets you skip `hash-object` for
unchanged files. But that is precisely the stat-cache logic git already implements, better
tested, via a persistent index. Prefer reusing the index over hand-rolling the comparison.

The one case for doing it yourself: the files are generated externally and you have
out-of-band knowledge of what changed (a manifest, a build log). Then feeding just those
entries beats any stat heuristic.

### Other plumbing-level knobs

Config, most impactful first on Windows:

- `index.skipHash = true` (Git 2.40+) — skips the trailing SHA-1 over the whole index on every
  write. Less significant now that the script writes the index once rather than N times, but still
  free.
- `index.version = 4` — path-prefix compression; smaller index means less to read and write.
- `core.fscache = true`, `core.fsmonitor = true`, `core.untrackedCache = true`.
  `feature.manyFiles = true` sets several of these together.
- `core.preloadIndex = true` (default on) parallelizes the stat pass.
- `GIT_OPTIONAL_LOCKS=0` prevents incidental index refreshes/writes from read-only commands.

Script-level, still outstanding:

- `mktemp` puts the scratch index and the file list in `%TEMP%`, a directory AV watches
  aggressively and which may be on a different volume. Putting them inside `.git/` instead would
  avoid both.
- Loose objects mean thousands of small NTFS file creates. If staying with `hash-object`, run
  `git gc` / `git repack` periodically — or move to `fast-import` and get a packfile for free.
- `rm -f $TEMP_INDEX_FILE $FILE_LIST` only runs on the success paths; a failure partway through
  leaks both files. A `trap ... EXIT` would cover all exits.

### If you were to keep optimizing, in order

1. AV exclusions for the repo and temp dir — zero code, often the largest single factor.
2. ~~Batch to one `hash-object --stdin-paths` + one `update-index --index-info`~~ — **done**;
   removed the O(N²) index I/O and the spawn storm.
3. Set `index.skipHash`, `index.version=4`, `feature.manyFiles`.
4. Persistent index + path-based `update-index --add` so unchanged files are never read.
5. If still not fast enough, rewrite as a single `git fast-import` stream — the only remaining fix
   for the loose-object write cost.

Steps 1–2 should get to "unnoticeable." Steps 4–5 would make the scripts much harder to read,
which is why this repo stops here.
