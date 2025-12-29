# Ensign Family History

Hi everyone, this is James Finlinson. I’ve been helping Suzie distribute the Ensign Family documents more broadly. I just invited you all to a shared folder containing many precious family photos, videos, audio recordings, and other documents. There are items related to Don Ensign, Phyllis Bench, and their growing up years.

All of the data currently occupies 180 GB of data! The data is stored in iCloud, and is also on a backup hard drive at Suzie’s house. Not to fear though, accepting the folder will NOT download it all onto your device. The iCloud link will give you access to download individual photos/videos.

Hopefully, you can each appreciate some of the memories represented in this shared digital archive.

## Updating the Backup Drive

`rsync` can be used to sync changes from the source into the backup.

```shell
# https://unix.stackexchange.com/a/203854/416782
# Notice the trailing slash on A, but no trailing slash on B
rsync -avu --delete "/home/user/A/" "/home/user/B"
```

### Command Used

```shell
rsync -avu --delete --exclude ".git" "/path/to/Family Ensign History/" "/path/to/backup/Ensign Family History"
```

## Git History

The source folder is enabled for `git` change tracking for a few select files on Suzie's local computer. The `git` repository is intentionally placed outside of the control of iCloud which likes to offload and optimize certain files. The `git` history allows for easy revision of this README.md file.

To setup:
1. Connect to the remote
  ```shell
  git remote add origin https://github.com/frozenfrank/byte-bin.git
  ```
2. Fetch the branch corresponding to this project
  ```shell
  git fetch origin ensign-family-history
  ```
3. Setup tracking with remote branch
  ```shell
  git branch --set-upstream-to origin/ensign-family-history
  ```
4. Advance to the tip of the remote branch (one time only)
  ```shell
  git reset --hard @{upstream}
  ```
5. Update with future changes
  ```shell
  git pull
  ```
