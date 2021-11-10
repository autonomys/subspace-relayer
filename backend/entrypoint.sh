#!/bin/sh

if [ $MODE = "feeds" ]; then
    echo  "Starting on create feeds mode"
    node dist/tools/create-feeds.js
elif [ $MODE = "fund" ]; then
    echo  "Starting on fund accounts mode"
    node dist/tools/fund-accounts.js
else
    echo  "Starting on relayer mode"
    node dist/index.js
fi
