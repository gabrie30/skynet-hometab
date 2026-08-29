.PHONY: install build clean release

install:
	npm install

build: install
	npm run build

clean:
	rm -rf dist/bundle.js dist/bundle.js.* dist/application.css dist/application.css.map dist/bundle.js.LICENSE.txt
	rm -f skynet-*.zip

release: clean build
	@VERSION=$$(node -p "require('./package.json').version"); \
	zip -r "skynet-$$VERSION.zip" manifest.json dist/ -x "dist/*.map" "dist/*.LICENSE.txt"; \
	echo "Built skynet-$$VERSION.zip"
