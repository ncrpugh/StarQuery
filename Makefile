# StarQuery Makefile

# Install Node dependencies (for tests)
install:
	npm install

# Run the game locally
run:
	python -m http.server 8000

# Run tests
test:
	npm test
