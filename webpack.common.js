const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyPlugin = require("copy-webpack-plugin");
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const TerserPlugin = require("terser-webpack-plugin");
const InstallPaths = require('./config/config-install');
const copyPatterns = require('./webpackCopyPatterns');
const Dotenv = require('dotenv-webpack');
const child_process = require('child_process');
const fs = require('fs');
const MarkdownIt = require('markdown-it');
const md = new MarkdownIt();
const CircularDependencyPlugin = require('circular-dependency-plugin')

const dotenv = require('dotenv');
const result = dotenv.config({ path: './shared.env' });
if (result.error) {
    throw result.error;
}

function getFormattedLocalDateTime() {
    const now = new Date();
    const year = String(now.getFullYear()).substring(2);
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const gitTag = process.env.VERSION ||
        child_process.execSync('git describe --tags --abbrev=0', { encoding: 'utf8' }).trim();
    return `Sitrec ${gitTag}: ${year}-${month}-${day} ${hours}:${minutes} PT`;
}

console.log(getFormattedLocalDateTime());

module.exports = {

    entry: {
        index: './src/index.js',
    },
    target: 'web',
    externals: {
        'node:fs': 'commonjs2 fs',
    },
    module: {
        rules: [
            {
                test: /\.css$/,
                use: [
                    MiniCssExtractPlugin.loader,
                    'css-loader',
                ],
            },
        ],
    },
    resolve: {
        extensions: ['.js'],
        alias: {},
    },
    plugins: [
        new Dotenv({
            path: './shared.env',
        }),
        new MiniCssExtractPlugin(),
        new HtmlWebpackPlugin({
            title: "Sitrec - Metabunk's Situation Recreation Tool",
        }),
        new webpack.ProvidePlugin({
            Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
            $: "jquery",
            jQuery: "jquery",
        }),
        new CopyPlugin({
            patterns: [
                ...copyPatterns, // Existing patterns
                {
                    from: path.resolve(__dirname, 'docs'),
                    to: path.resolve(InstallPaths.dev_path, 'docs'),
                    globOptions: {
                        ignore: ['**/*.md'], // Ignore Markdown files here
                    },
                },
            ],
        }),
        {
            // Custom plugin for converting Markdown to HTML
            apply: (compiler) => {
                compiler.hooks.afterEmit.tapPromise('MarkdownToHtmlPlugin', async () => {
                    const docsDir = path.resolve(__dirname, 'docs');
                    const outputDir = path.resolve(InstallPaths.dev_path, 'docs');
                    const rootReadme = path.resolve(__dirname, 'README.md');
                    const outputRootReadme = path.resolve(InstallPaths.dev_path, 'README.html');

                    const convertMarkdownFiles = async (dir) => {
                        const files = await fs.promises.readdir(dir, { withFileTypes: true });

                        for (const file of files) {
                            const fullPath = path.join(dir, file.name);
                            const relativePath = path.relative(docsDir, fullPath);
                            const outputPath = path.join(outputDir, relativePath.replace(/\.md$/, '.html'));

                            if (file.isDirectory()) {
                                await fs.promises.mkdir(path.join(outputDir, relativePath), { recursive: true });
                                await convertMarkdownFiles(fullPath);
                            } else if (file.name.endsWith('.md')) {
                                const markdownContent = await fs.promises.readFile(fullPath, 'utf-8');
                                const htmlContent = md.render(markdownContent);
                                await fs.promises.writeFile(outputPath, htmlContent, 'utf-8');
                            }
                        }
                    };

                    // Convert Markdown files in the `docs` directory
                    await convertMarkdownFiles(docsDir);

                    // Convert the root README.md file
                    if (fs.existsSync(rootReadme)) {
                        const readmeContent = await fs.promises.readFile(rootReadme, 'utf-8');
                        const htmlContent = md.render(readmeContent);
                        await fs.promises.writeFile(outputRootReadme, htmlContent, 'utf-8');
                    }
                });
            },
        },
        new webpack.DefinePlugin({
            'process.env.BUILD_VERSION_STRING': JSON.stringify(getFormattedLocalDateTime()),
            'CAN_REQUIRE_CONTEXT': JSON.stringify(true),
        }),

        new CircularDependencyPlugin({
            // `onStart` is called before the cycle detection starts
            onStart({ compilation }) {
                console.log('start detecting webpack modules cycles');
            },
            // `onDetected` is called for each module that is cyclical
            onDetected({ module: webpackModuleRecord, paths, compilation }) {
                //return;

                const ignoreModules = ["mathjs"];
                // return if any of the ignoreModules is a substring of any of the paths
                if (paths.some(path => ignoreModules.some(ignoreModule => path.includes(ignoreModule)))) {
                    return;
                }
                // `paths` will be an Array of the relative module paths that make up the cycle
                // `module` will be the module record generated by webpack that caused the cycle
                compilation.errors.push(new Error(paths.join(' -> ')))
            },
            // `onEnd` is called before the cycle detection ends
            onEnd({ compilation }) {
                console.log('end detecting webpack modules cycles');
            },
        }),


    ],
    experiments: {
        topLevelAwait: true,
    },
    optimization: {
        minimizer: [
            new TerserPlugin({
                // exclude files starting with "Sit" and ending with ".js"
                exclude: /Sit.*\.js$/,
                terserOptions: {
                    keep_classnames: true,
                },
            }),
        ],
    },
    performance: {
        maxAssetSize: 2000000,
        maxEntrypointSize: 5000000,
    },
    output: {
        filename: '[name].[contenthash].bundle.js',
        path: InstallPaths.dev_path,
        clean: true, // this deletes the contents of path (InstallPaths.dev_path)
    },
};
