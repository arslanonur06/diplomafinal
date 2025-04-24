#!/bin/bash

# Base directories
BASE_DIR="/Users/oa/Desktop/diplom/social-network-platform/frontend/public/images/stock"
PROFILE_DIR="$BASE_DIR/profile"
EVENTS_DIR="$BASE_DIR/events"
GROUPS_DIR="$BASE_DIR/groups"
CONTENT_DIR="$BASE_DIR/content"
COVERS_DIR="$BASE_DIR/covers"
DEFAULTS_DIR="$BASE_DIR/defaults"

# Create directories if they don't exist
mkdir -p "$PROFILE_DIR" "$EVENTS_DIR" "$GROUPS_DIR" "$CONTENT_DIR" "$COVERS_DIR" "$DEFAULTS_DIR"

# Function to download image
download_image() {
  local url=$1
  local output=$2
  curl -L "$url" -o "$output"
}

# Profile Images
download_image "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7" "$PROFILE_DIR/male-1.jpg"
download_image "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d" "$PROFILE_DIR/male-2.jpg"
download_image "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d" "$PROFILE_DIR/male-3.jpg"
download_image "https://images.unsplash.com/photo-1494790108377-be9c29b29330" "$PROFILE_DIR/female-1.jpg"
download_image "https://images.unsplash.com/photo-1534528741775-53994a69daeb" "$PROFILE_DIR/female-2.jpg"
download_image "https://images.unsplash.com/photo-1517841905240-472988babdf9" "$PROFILE_DIR/female-3.jpg"

# Event Images
download_image "https://images.unsplash.com/photo-1505373877841-8d25f7d46678" "$EVENTS_DIR/tech-conference.jpg"
download_image "https://images.unsplash.com/photo-1531058020387-3be344556be6" "$EVENTS_DIR/art-exhibition.jpg"
download_image "https://images.unsplash.com/photo-1511578314322-379afb476865" "$EVENTS_DIR/networking.jpg"
download_image "https://images.unsplash.com/photo-1459749411175-04bf5292ceea" "$EVENTS_DIR/music-festival.jpg"
download_image "https://images.unsplash.com/photo-1516321318423-f06f85e504b3" "$EVENTS_DIR/workshop.jpg"
download_image "https://images.unsplash.com/photo-1452587925148-ce544e77e70d" "$EVENTS_DIR/photography.jpg"

# Group Images
download_image "https://images.unsplash.com/photo-1550751827-4bd374c3f58b" "$GROUPS_DIR/technology.jpg"
download_image "https://images.unsplash.com/photo-1513364776144-60967b0f800f" "$GROUPS_DIR/art.jpg"
download_image "https://images.unsplash.com/photo-1511379938547-c1f69419868d" "$GROUPS_DIR/music.jpg"
download_image "https://images.unsplash.com/photo-1452587925148-ce544e77e70d" "$GROUPS_DIR/photography.jpg"
download_image "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800" "$GROUPS_DIR/travel.jpg"
download_image "https://images.unsplash.com/photo-1504674900247-0877df9cc836" "$GROUPS_DIR/food.jpg"

# Content Images
download_image "https://images.unsplash.com/photo-1461749280684-dccba630e2f6" "$CONTENT_DIR/web-development.jpg"
download_image "https://images.unsplash.com/photo-1449824913935-59a10b8d2000" "$CONTENT_DIR/urban-photography.jpg"
download_image "https://images.unsplash.com/photo-1558655146-d09347e92766" "$CONTENT_DIR/digital-art.jpg"
download_image "https://images.unsplash.com/photo-1542601906990-b4d3fb778b09" "$CONTENT_DIR/eco-living.jpg"
download_image "https://images.unsplash.com/photo-1474511320723-9a56873867b5" "$CONTENT_DIR/wildlife.jpg"
download_image "https://images.unsplash.com/photo-1466637574441-749b8f19452f" "$CONTENT_DIR/cooking.jpg"

# Cover Images
download_image "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05" "$COVERS_DIR/nature.jpg"
download_image "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df" "$COVERS_DIR/city.jpg"
download_image "https://images.unsplash.com/photo-1550537687-c91072c4792d" "$COVERS_DIR/abstract.jpg"
download_image "https://images.unsplash.com/photo-1518770660439-4636190af475" "$COVERS_DIR/technology.jpg"

# Default Images
download_image "https://images.unsplash.com/photo-1511367461989-f85a21fda167" "$DEFAULTS_DIR/avatar.jpg"
download_image "https://images.unsplash.com/photo-1557683316-973673baf926" "$DEFAULTS_DIR/cover.jpg"
download_image "https://images.unsplash.com/photo-1515187029135-18ee286d815b" "$DEFAULTS_DIR/group.jpg"
download_image "https://images.unsplash.com/photo-1505236858219-8359eb29e329" "$DEFAULTS_DIR/event.jpg"

echo "All images have been downloaded successfully!"
