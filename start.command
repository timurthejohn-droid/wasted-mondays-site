#!/bin/bash
# Двойной клик: запускает сайт на http://localhost:8850 и открывает его в браузере.
cd "$(dirname "$0")"
open "http://localhost:8850" &
node server/index.js
