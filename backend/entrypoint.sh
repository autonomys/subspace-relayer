#!/bin/sh
if [ "$1" = "create-feeds" ] || [ "$1" = "fund-accounts" ]; then
    echo "Starting" $1 " Mode"
    node dist/tools/$1.js
else
    echo "Starting relayer Mode"
    node dist/index.js
fi
