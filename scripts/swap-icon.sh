#!/bin/bash
# Usage: bash scripts/swap-icon.sh [neon-blueprint|forged|dual-tone]
# Swaps all app icons to the selected theme

THEME=$1
BASE="public/icons/$THEME"

if [ -z "$THEME" ] || [ ! -d "$BASE" ]; then
  echo "Usage: bash scripts/swap-icon.sh [neon-blueprint|forged|dual-tone]"
  echo "Available themes:"
  ls public/icons/
  exit 1
fi

cp "$BASE/icon.svg" public/icon.svg
cp "$BASE/icon.svg" src/app/icon.svg  # will use small version below if exists
cp "$BASE/icon-512.png" public/icon-512.png
cp "$BASE/icon-192.png" public/icon-192.png
cp "$BASE/favicon.ico" public/favicon.ico
cp "$BASE/favicon.ico" src/app/favicon.ico

if [ -f "$BASE/icon-small.svg" ]; then
  cp "$BASE/icon-small.svg" src/app/icon.svg
fi

echo "Swapped to: $THEME"
