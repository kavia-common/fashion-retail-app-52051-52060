#!/bin/bash
cd /home/kavia/workspace/code-generation/fashion-retail-app-52051-52060/shopping_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

