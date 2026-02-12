# garage-trip-web

A web application for the Garage Trip event.

## Technologies
* Node.js
* Yarn
* Gulp
* Jekyll
* Github pages

## Steps
1. `corepack enable` - enables corepack for project
2. `corepack install` - installs the yarn package
3. `yarn install` - installs dependencies
4. `yarn run gulp` - creates assets (images)
5. `jekyll serve` - runs the server on http://127.0.0.1:4000


## Troubleshooting

### Gulp - Linux
Make sure you have `graphicsmagick` on system
To check run `gm version`.
If not present install `sudo apt install graphicsmagick`

### Jekyll
Make sure you have Jekyll installed https://jekyllrb.com/
1. `sudo apt install ruby-dev`
2. `sudo apt install ruby-rubygems`
3. `sudo gem install bundler jekyll`