#!/bin/bash
command -v ab >/dev/null 2>&1 || { echo "ab missing. Installation might work with sudo apt-get install apache2-utils" ; exit 1; }
formats=(texvcinfo mml svg)
SCRIPT_DIR=$(cd $(dirname $0) && pwd);
for format in "${formats[@]}"
do
  ab -n 100 -c 8 -p $SCRIPT_DIR/../test/files/post_data -T 'application/x-www-form-urlencoded' localhost:10042/$format > $SCRIPT_DIR/../doc/test_results/performance_$format.txt
done
