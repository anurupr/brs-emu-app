#!/bin/bash

rm -rf dist && yarn dist && sudo ./dist/linux-unpacked/brs-emu-app --no-sandbox
