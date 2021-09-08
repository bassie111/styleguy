const path = require('path');
const {WebpackTwigStyleguide} = require("./webpack-twig-styleguide");

module.exports = {
    entry: './index.js',
    plugins: [
        new WebpackTwigStyleguide({
            componentsFolder: './demo/components'
        })
    ],
    output: {
        filename: 'main.js',
        path: path.resolve(__dirname, 'dist'),
    },
};
