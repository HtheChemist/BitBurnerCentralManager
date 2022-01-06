#!/usr/bin/env bash

cd ./build || exit

jsFiles=$(find . -name "*.js")

echo "$jsFiles" | while read -r line; do
  echo "> Building file ${line%.*}.ns"
  sed -re 's/(import.*\"\/.*)\"/\1\.ns\"/g' "$line" > "${line%.*}.ns"
done

cd - || exit
