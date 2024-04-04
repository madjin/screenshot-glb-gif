#!/bin/bash

# Run this on a folder of glb files to generate model viewer template sites
# Usage: `bash modelviewer-generator.sh folder`

# Check if the directory is provided as a command line argument
if [ $# -eq 0 ]; then
  echo "Please provide the directory path as a command line argument."
  exit 1
fi

# Set the directory path
directory="$1"

# Find all GLB files recursively within the directory
glb_files=$(find "$directory" -type f -name "*.glb")

# Loop through all GLB files found
while IFS= read -r glb_file; do
  # Extract the directory of the GLB file
  glb_dir=$(dirname "$glb_file")

  # Extract the base name of the GLB file
  base_name=$(basename "$glb_file" .glb)
  
  # Generate the HTML file for the current GLB
  html_file="${glb_dir}/${base_name}.html"
  
  # Create the HTML content
  cat > "$html_file" <<EOL
<!DOCTYPE html>
<html>
<head>
  <title>$base_name</title>
  <script type="module" src="https://unpkg.com/@google/model-viewer/dist/model-viewer.min.js"></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: transparent;
    }
    model-viewer {
      width: 100%;
      height: 100%;
      touch-action: none;
      --progress-bar-color: transparent;
    }
    .navigation {
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
    }
    .navigation button {
      margin: 0 10px;
    }
  </style>
</head>
<body>
  <model-viewer src="${base_name}.glb" camera-controls tone-mapping="commerce" interaction-prompt="none" shadow-intensity="1" shadow-softness="1"></model-viewer>
  <div class="navigation">
  </div>
</body>
</html>
EOL

  echo "Generated HTML file: $html_file"
done <<< "$glb_files"

echo "HTML files generated in the same location as GLB files."
