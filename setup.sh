#!/bin/bash

echo "Creating structure for the Embedded Bird Classifier project..."

mkdir -p running
mkdir -p running/new_audio_samples
mkdir -p running/saved_audio_samples
mkdir -p running/analizing_results

touch src/__init__.py

echo "Structure created successfully!"