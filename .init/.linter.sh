#!/bin/bash
cd /home/kavia/workspace/code-generation/sunset-dragon-flight-104922-f3ffa8a8/dragon_game_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

