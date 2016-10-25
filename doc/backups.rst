Setting-up backups for an IdeaLoom server
=========================================

Scripts are included to use Borg Backup (en encrypting, deduplicating archiver)

These instructions are for Ubuntu Linux, but Borg is cross-platform

Installing Borg Backup
----------------------

Installing an up to date Borg Backup
(https://borgbackup.github.io/borgbackup/) Ubuntu:

::

    sudo apt-get install python3-pip libacl1-dev liblz4-dev libssl-dev
    sudo pip3 install --upgrade borgbackup

Using
-----

The script is in ``doc/borg_backup_script/idealoom_borg_backup.sh``

It assumes:

 - borgbackup is installed on both the IdeaLoom server and the backup server
 - The user running the script has access over ssh to the
   backup server with key authentication (no passphrase). Typically, this
   will be the ``www-data`` user.
 - The user running the script has access over ssh to itself
   with key authentication (no passphrase).


The script takes two environment variables:

``IDEALOOM_PATH``: the path to the idealoom installation to backup
``REPOSITORY``: the address of the borg backup repository to backup to

Create a script such as:
/home/backups/backup_all_idealoom.sh

::
    #!/bin/bash

    export PATH=$PATH:/usr/local/bin
    export IDEALOOM_PATH=/home/www/idealoom_discussions_conversence_com
    export REPOSITORY=www-data@coeus.ca:/media/backup/idealoom_backups_conversence_discussions.borg
    bash ${IDEALOOM_PATH}/doc/borg_backup_script/idealoom_borg_backup.sh > $IDEALOOM_PATH/var/log/idealoom_backup.log 2>&1


You can then automate with cron. For example:

::

    sudo su - www-data
    crontab -e
    0 3 * * * /bin/bash /home/backups/backup_all_idealoom.sh

All backups are encrypted. Make SURE you backup the keys (normally in
``~/.borg/keys/``) somewhere safe, otherwise your backups will be
useless!

To secure the user, use an extemely restricted permission in ~/.ssh/authorized_keys

::

    # Allow an SSH keypair to only run |project_name|, and only have access to /media/backup.
    # This will help to secure an automated remote backup system.
    $ cat ~/.ssh/authorized_keys
    command="borg serve --restrict-to-path /media/backup" ssh-rsa AAAAB3[...]

Restoring
---------

TODO
