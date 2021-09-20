const PACKAGE = require('./package.json');
const BannerPlugin = require('webpack/lib/BannerPlugin');
const DefinePlugin = require('webpack/lib/DefinePlugin');
const CopyPlugin = require('copy-webpack-plugin');
const TerserPlugin = require('terser-webpack-plugin');
const HtmlMinimizerPlugin = require('html-minimizer-webpack-plugin');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');
const path = require('path');

module.exports = {
    mode: 'production',
    devtool: 'source-map',
    entry: './src/index.ts',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
            {
                test: /\.(eot|ttf|woff|woff2|svg)$/,
                type: 'asset/resource',
                generator: {
                    filename: 'webfonts/[name]-[hash][ext][query]',
                },
            },
            {
                test: /.s?css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    {loader: 'css-loader'},
                    {loader: 'sass-loader'},
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js'],
    },
    output: {
        clean: true,
        filename: 'js/main.js',
        path: path.resolve(__dirname, 'dist'),
    },
    plugins: [
        // Pass current version number
        new DefinePlugin({
            __VERSION__: JSON.stringify(PACKAGE.version),
        }),

        // Where the compiled SASS is saved to
        new MiniCssExtractPlugin({
            filename: 'css/main.css',
        }),

        // Add comment before generated files.
        // https://webpack.js.org/plugins/banner-plugin/
        new BannerPlugin({
            banner: `${PACKAGE.description} ${PACKAGE.version} | ©2020-${new Date().getFullYear()} ${PACKAGE.author}`,
            entryOnly: true,
        }),

        // Copy assets into dist directory.
        // https://webpack.js.org/plugins/copy-webpack-plugin/
        new CopyPlugin({
            patterns: [
                {
                    from: path.resolve(__dirname, 'assets'),
                    to: path.resolve(__dirname, 'dist'),
                },

                // Copy asset sub folders without minification.
                //{
                //    from: path.resolve(__dirname, 'assets'),
                //    to: path.resolve(__dirname, 'dist'),
                //    // Don't minimize assets, assume they are already minimized.
                //    info: {minimized: true},
                //    globOptions: {
                //        ignore: [
                //            // Ignore all `html` files
                //            "**/*.html",
                //        ],
                //    },
                //},

                // Copy asset files on root with minification.
                //{
                //    from: path.resolve(__dirname, 'assets'),
                //    to: path.resolve(__dirname, 'dist'),
                //    globOptions: {
                //        deep: 0,
                //        onlyFiles: true,
                //    },
                //},
            ],
        }),
    ],
    optimization: {
        minimize: true,
        minimizer: [
            // Configure minimization.
            // https://webpack.js.org/plugins/terser-webpack-plugin/
            new TerserPlugin({
                // Don't extract comments into a separate license file.
                extractComments: false,
            }),
            new HtmlMinimizerPlugin(),
            new CssMinimizerPlugin(),
        ],
    },
    performance: {
        maxEntrypointSize: 512000,
        maxAssetSize: 512000,
        assetFilter: function (assetFilename) {
            return assetFilename.endsWith('.js') || assetFilename.endsWith('.css');
        },
    },
};
