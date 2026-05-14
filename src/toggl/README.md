# Toggl API
All information gathered using the Toggl API: https://engineering.toggl.com/docs/

## Proof of Concept Testing

Execute the `test.sh` script:

```shell
export TOKEN=""  # Enter Toggl API Token here
export WORKSPACE_ID="" # If left blank, will be populated with the default workspace ID

./test.sh
```

Use the CloudFunction emulators to execute the `test.js` script:

```shell
cd cloud-functions/functions
# {split terminal}
firebase emulators:start # In terminal 1
node # In terminal 2
> .load ../../docs/delorean/toggl/test.js
> test(1,0,"http://127.0.0.1:5001/byte-bin/us-central1/proxy")
```
