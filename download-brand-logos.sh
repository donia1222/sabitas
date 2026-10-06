#!/bin/bash
# Run this from the project root: bash download-brand-logos.sh

mkdir -p public/images/brands

brands=(
  "airsoft:airsoft.ch"
  "blackflash:black-flash-archery.com"
  "boker:boker.de"
  "fishermans:fishermans-partner.eu"
  "haller:haller-stahlwaren.de"
  "jenzi:jenzi.com"
  "linder:linder.de"
  "naturzone:naturzone.ch"
  "pohlforce:pohlforce.de"
  "smoki:smoki-raeuchertechnik.de"
  "steambow:steambow.at"
  "sytong:sytong.global"
  "wiltec:wiltec.de"
)

for entry in "${brands[@]}"; do
  name="${entry%%:*}"
  domain="${entry##*:}"
  echo "Downloading $name ($domain)..."
  curl -sL --max-time 10 "https://logo.clearbit.com/$domain" -o "public/images/brands/${name}.png" && echo "  ✓ OK" || echo "  ✗ FAIL"
done

echo ""
echo "Done! Files in public/images/brands/:"
ls -lh public/images/brands/
