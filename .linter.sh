#!/bin/bash
cd /home/kavia/workspace/code-generation/typemaster-114997-41c0e5d8/typing_tester_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

