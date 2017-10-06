# Prod Ops Chrome Tab
Chrome extension for prod-ops team

# Installing from source
1. Clone the repo locally, where you want to plugin to live
2. If you don't have node installed, do that first `brew install node`, if you don't have webpack installed do that now `brew install webpack`
3. In the directory run `npm install --save webpack react react-dom redux react-redux babel-core babel-loader babel-preset-react babel-preset-es2015 webpack-dev-server lodash`
4. Then run `npm start` (once its finished loading you can ctrl-c out, it just has to build once) and finally `webpack --watch` (ctrl-c)
5. Go to Chrome -> More Tools -> Extensions
6. Check the "Developer mode" at the top of page
7. Click "Load unpacked extension..." at top of page and select repo and select the repo

# Getting latest updates
1. `git pull` from the repo to get the latest changes
2. cd into the repo and run `npm start` (ctrl-c out) then `webpack --watch` (ctrl-c)
3. Go to Chrome -> More Tools -> Extensions
4. Find the extension and click reload

# Intstalling from zip
1. If you already have the extension running, just replace the old folder with the new one and reload in chrome. If not follow instructions below.
1. Unzip in the directory you want the plugin to live
2. Click the three vertical dots in the upper right hand corner of Chrome (plugin does not work on any other browser)
3. Click more tools -> extensions
4. Make sure the Developer Mode checkbox is enabled
5. Click Load Unpacked extention
6. Find the folder you extracted from the zip
7. Make sure you reload the extention.

# Adding Links
If you want to add your own links, just edit the master_links.js file in the root directory.

# Running locally
1. `$ npm start`
2. localhost:8080

# Preview
![alt tag](https://cloud.githubusercontent.com/assets/1512282/24662930/6b61bbc4-190b-11e7-84d8-5245c65abc60.png)
