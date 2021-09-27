const path = require('path');
const {WebpackTwigStyleguide} = require("./source/styleguide_plugin/webpack-twig-styleguide");
const globImporter = require('node-sass-glob-importer');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const BrowserSyncPlugin = require('browser-sync-webpack-plugin')

const styleGuidePluginInstance = new WebpackTwigStyleguide({
    componentsFolder: './source/components',
    pagesFolder: './source/pages'
});

module.exports = (env, argv) => ({
    entry: {
        main: './source/index.js',
        styleguide: './source/styleguide_plugin/index.js',
    },
    plugins: [
        styleGuidePluginInstance,
        new MiniCssExtractPlugin({
            filename: '[name]' + (argv.mode === 'production' ? '.[contenthash]' : '') + '.css'
        }),
        new BrowserSyncPlugin({
            host: 'localhost',
            server: true,
            files: './dist',
            ignore: "**/*.json",
            injectCss: true,
            directory: true,
            startPath: '/dist/styleguide',
            open: true,
        },{
            reload: false
        })
    ],
    module: {
        rules: [
            {
                test: /\.(scss|css)$/,
                use: [
                    {
                        loader:  MiniCssExtractPlugin.loader, //Creates files from css file
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true
                        }
                    },
                    {
                        loader: 'sass-loader',
                        options: {
                            sourceMap: true,
                            sassOptions: {
                                importer: globImporter(),
                            }
                        }
                    },
                ]
            },
        ]
    },
    output: {
        filename: '[name].js',
        path: path.resolve(__dirname, 'dist/assets'),
    },
});
