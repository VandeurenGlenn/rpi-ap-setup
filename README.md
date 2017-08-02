# rpi-ap-setup

## API
### Methods

#### init(options)
##### options {object} {yesForAll: boolean} default {yesForAll: false} defaults all prompts
  setup a new access point

#### restore()
  restores all files & reboots after restore, creates a backup, installs packages, transforms/creates needed files & reboots on success.

  
## TODO
- [ ] run on start (untill setup is done)
- [ ] run server after setup (get user network & password) then restore.
