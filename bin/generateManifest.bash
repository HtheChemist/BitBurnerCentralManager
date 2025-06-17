#!/bin/bash

cd ./build || exit

rm -f resources/manifest.txt
touch resources/manifest.txt

nsFile=$(find . -type f -name "*.js" -not -name "*Bitburner.t*" | sort)

echo "$nsFile" | while read -r line; do
  echo "$line" >> resources/manifest.txt
done

cd - || exit
