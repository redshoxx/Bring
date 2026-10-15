#!/usr/bin/env bash
set -euo pipefail
task_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$task_root/mobile"
if [ "$(uname -s)" != "Darwin" ]; then
  echo 'Der iPhone-Build benötigt macOS und Xcode. Nutze den enthaltenen GitHub-Actions-Workflow.' >&2
  exit 1
fi
npx expo prebuild --platform ios --clean
cd ios
pod install
xcodebuild -workspace UnserAlltag.xcworkspace -scheme UnserAlltag -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' -derivedDataPath "$task_root/.private/ios-build" CODE_SIGNING_ALLOWED=NO CODE_SIGNING_REQUIRED=NO archive -archivePath "$task_root/.private/UnserAlltag.xcarchive"
mkdir -p "$task_root/releases/Payload"
cp -R "$task_root/.private/UnserAlltag.xcarchive/Products/Applications/UnserAlltag.app" "$task_root/releases/Payload/"
cd "$task_root/releases"
zip -qry Unser-Alltag.ipa Payload
rm -rf "$task_root/releases/Payload"
echo 'IPA für SideStore: releases/Unser-Alltag.ipa'
