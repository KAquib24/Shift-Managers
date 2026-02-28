#!/bin/bash
# scripts/logs.sh

if [ -z "$1" ]; then
    docker-compose logs -f
else
    docker-compose logs -f "$1"
fi