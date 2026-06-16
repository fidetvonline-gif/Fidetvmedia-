#!/bin/bash

# FideTV M3U Ingest Utility
# Description: Automated M3U downloader, parser, and stream validator

SOURCE_URL=${1:-"https://iptv-org.github.io/iptv/index.m3u"}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
INGEST_SCRIPT="./scripts/ingest_m3u.ts"

# Colors for logging
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}       FideTV Ingest Agent             ${NC}"
echo -e "${BLUE}=======================================${NC}"

# Check for Node.js / npx
if ! command -v npx &> /dev/null
then
    echo -e "${RED}Error: npx not found. Ensure Node.js is installed.${NC}"
    exit 1
fi

# Check if script exists
if [ ! -f "$INGEST_SCRIPT" ]; then
    echo -e "${RED}Error: Ingestion logic $INGEST_SCRIPT not found.${NC}"
    exit 1
fi

echo -e "${BLUE}[1/2]${NC} Initializing ingestion for: ${SOURCE_URL}"

# Run the ingestion script
npx tsx $INGEST_SCRIPT "$SOURCE_URL"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Ingestion completed successfully.${NC}"
    echo -e "${GREEN}Database updated in src/data/channels.json${NC}"
    echo -e "${GREEN}Logs available in ingestion.log${NC}"
else
    echo -e "${RED}Ingestion failed. Check ingestion.log for details.${NC}"
    exit 1
fi

echo -e "${BLUE}=======================================${NC}"
