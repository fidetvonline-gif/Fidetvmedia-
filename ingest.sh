#!/bin/bash

# FideTV Smart Ingestion Orchestrator
# This script triggers the cleanup and ingestion process from priority sources.

set -e

# Priority Source Links (IPTV-ORG)
SOURCES=(
  "https://iptv-org.github.io/iptv/countries/ng.m3u"
  "https://iptv-org.github.io/iptv/categories/sports.m3u"
  "https://iptv-org.github.io/iptv/categories/movies.m3u"
  "https://iptv-org.github.io/iptv/categories/entertainment.m3u"
  "https://iptv-org.github.io/iptv/categories/news.m3u"
  "https://iptv-org.github.io/iptv/categories/documentary.m3u"
  "https://iptv-org.github.io/iptv/categories/religious.m3u"
  "https://iptv-org.github.io/iptv/languages/eng.m3u"
  "https://i.mjh.nz/PlutoTV/us.m3u8"
  "https://i.mjh.nz/SamsungTVPlus/us.m3u8"
  "https://i.mjh.nz/Plex/us.m3u8"
)

echo ">>> [FideTV] Starting Smart Ingestion Orchestrator <<<"

# 1. Update Ingestion Logic
echo ">>> [1/3] Running Smart Ingestion Sequence..."

for URL in "${SOURCES[@]}"
do
  echo ">>> Aggregating from: $URL"
  npx tsx scripts/ingest_m3u_v2.ts "$URL"
done

# 2. Cleanup & Optimization
echo ">>> [2/3] Pruning existing low-quality channels and duplicates..."
npx tsx scripts/cleanup_channels.ts

# 3. Final Health Check
echo ">>> [3/3] Running final health checks on database..."
npx tsx scripts/run_health_checks.ts

echo ">>> [FideTV] Ingestion Cycle Complete. <<<"
