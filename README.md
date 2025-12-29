# Ensign Family History

Hi everyone, this is James Finlinson. I’ve been helping Suzie distribute the Ensign Family documents more broadly. I just invited you all to a shared folder containing many precious family photos, videos, audio recordings, and other documents. There are items related to Don Ensign, Phyllis Bench, and their growing up years.

All of the data currently occupies 180 GB of data! The data is stored in iCloud, and is also on a backup hard drive at Suzie’s house. Not to fear though, accepting the folder will NOT download it all onto your device. The iCloud link will give you access to download individual photos/videos.

Hopefully, you can each appreciate some of the memories represented in this shared digital archive.

## Change Management

This folder uses a form of Git to track which files have changed overtime.

The contents of the files are not saved in the git repository, only the metadata about each file.

## Updating the Backup Drive

`rsync` can be used to sync changes from the source into the backup.

```shell
# https://unix.stackexchange.com/a/203854/416782
# Notice the trailing slash on A, but no trailing slash on B
rsync -avu --delete "/home/user/A/" "/home/user/B"
```

### Command Used

```shell
rsync -avu --exclude '.git' --delete "/path/to/Family Ensign History/" "/path/to/backup/Ensign Family History"
```
