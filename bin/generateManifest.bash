#!/bin/bash

cd ./build || exit

rm -f resources/manifest.txt
touch resources/manifest.txt

nsFile=$(find . -type f -name "*.ns" -not -name "*Bitburner.t*")

echo "$nsFile" | while read -r line; do
  echo "$line" >> resources/manifest.txt
done

cd - || exit
