#!/bin/bash

# Start the mock API container
echo "Starting mock API container..."
docker run -d --name quant-mock-api -p 4010:4010 ghcr.io/quantcdn/quant-mock-api:4.0.0

# Wait for the container to be ready
echo "Waiting for mock API to be ready..."
timeout=30
counter=0
while ! curl -s http://localhost:4010/health > /dev/null 2>&1; do
  if [ $counter -eq $timeout ]; then
    echo "Mock API failed to start within $timeout seconds"
    docker logs quant-mock-api
    docker stop quant-mock-api
    docker rm quant-mock-api
    exit 1
  fi
  sleep 1
  counter=$((counter + 1))
done

echo "Mock API is ready, running tests..."

# Run the tests
npm test

# Capture the test exit code
test_exit_code=$?

# Clean up
echo "Cleaning up mock API container..."
docker stop quant-mock-api
docker rm quant-mock-api

# Exit with the test result
exit $test_exit_code
