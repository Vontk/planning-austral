#!/usr/bin/env bash
set -euo pipefail
project_dir="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
: "${ANDROID_HOME:?Set ANDROID_HOME to your Android SDK}"
: "${CAMPUS_SIGNING_DIR:?Set CAMPUS_SIGNING_DIR to the directory with release.p12 and password}"
version="${1:-1.0.0}"
[[ "$version" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo 'Expected a semantic version' >&2; exit 1; }
build_tools="$ANDROID_HOME/build-tools/35.0.0"
output_dir="$project_dir/artifacts"
mkdir -p "$output_dir"
"$build_tools/zipalign" -f -P 16 4 "$project_dir/android/app/build/outputs/apk/release/app-release-unsigned.apk" "$output_dir/campus-aligned.apk"
"$build_tools/apksigner" sign --v4-signing-enabled false --ks "$CAMPUS_SIGNING_DIR/release.p12" --ks-key-alias campuslookup --ks-pass "file:$CAMPUS_SIGNING_DIR/password" --out "$output_dir/campus-lookup-$version.apk" "$output_dir/campus-aligned.apk"
"$build_tools/apksigner" verify --verbose --print-certs "$output_dir/campus-lookup-$version.apk"
"$build_tools/zipalign" -c -P 16 4 "$output_dir/campus-lookup-$version.apk"
rm "$output_dir/campus-aligned.apk"
(cd "$output_dir" && sha256sum "campus-lookup-$version.apk" > SHA256SUMS)
