#!/bin/bash
if [[ ! -e /opt/tinylogs.txt ]]; then
    mkdir -p /logs
    touch /opt/tinylogs.txt
fi
cd /tinythings/TinyNode
npm install
npm start >> /opt/tinylogs.txt 2>&1 &