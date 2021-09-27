const fs = require("fs");
const path = require("path");
const Twig = require("twig"),
        twig = Twig.twig;
const Promise = require('es6-promise').Promise;


class WebpackTwigStyleguide {

    static defaultOptions = {
        pageTemplateFile: path.resolve(__dirname, 'templates/page.twig'),
        componentDisplayTemplateFile: path.resolve(__dirname, 'templates/component_display.twig'),
        componentsFolder: './components',
        pagesFolder: './pages',
        outputFolder: '../styleguide' // Relative to output folder
    };

    components = [];
    pages = [];
    renders = [];
    webpack;

    constructor(options = {}) {
        this.options = {...WebpackTwigStyleguide.defaultOptions, ...options};
    }

    getComponents() {
        this.readConfigs();
        return this.components;
    }

    getMenu() {
        const that = this;
        let menu = {};

        const addToMenu = (itemName) => {
            const nameParts = itemName.split('/');
            if (nameParts.length > 1) {
                if (!menu[nameParts[0]]) {
                    menu[nameParts[0]] = {
                        name: nameParts[0],
                        items: {}
                    }
                }
                menu[nameParts[0]].items[nameParts[1]] = {
                    name: nameParts[1],
                    path: `${itemName.replace('/', '-')}.html`,
                }
            } else {
                menu[itemName] = {
                    name: itemName,
                    path: `${itemName.replace('/', '-')}.html`,
                }
            }
        }

        this.components.map(component => {
            addToMenu(component.name);
        });


        this.pages.map(page => {
            addToMenu(page.replace(that.options.pagesFolder + '/', '').replace('.twig',''));
        });

        menu = Object.values(menu);

        const sorts = [
            'index',
            'introduction',
            'atom',
            'molecule',
            'organism',
            'template',
            'page'
        ];

        menu.sort((itemA, itemB) => {
            const sortA = sorts.indexOf(itemA.name) === -1 ? 1000 : sorts.indexOf(itemA.name);
            const sortB = sorts.indexOf(itemB.name) === -1 ? 1000 : sorts.indexOf(itemB.name);
            return sortA - sortB;
        });

        return menu;
    }

    /**
     *
     * @param dir
     * @returns {*[]}
     */
    scanDir = function (dir, test) {
        const that = this;
        var results = [];
        var list = fs.readdirSync(dir);
        list.forEach(function (file) {
            file = dir + '/' + file;
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(that.scanDir(file, test));
            } else {
                if (test(file)) {
                    results.push(file);
                }
            }
        });
        return results;
    }

    /**
     *
     */
    clean = function () {

    };

    /**
     *
     */
    readConfigs = function () {
        const that = this;
        const componentConfigFiles = that.scanDir(this.options.componentsFolder, (file) => {
            return file.indexOf('component.json') > 0
        });

        that.pages = that.scanDir(this.options.pagesFolder, (file) => {
            return file.indexOf('.twig') > 0
        });

        // Build index
        componentConfigFiles.forEach((componentConfigFile) => {
            const componentConfig = JSON.parse(fs.readFileSync(componentConfigFile));

            //Add global data for overview
            that.components.push({
                name: componentConfig.name,
                description: componentConfig.description || null,
                config: componentConfig,
                path: componentConfigFile.replace('.component.json', '')
            });
        });
    };

    /**
     *
     * @param compilation
     */
    renderPages = function (compilation) {
        const that = this;
        that.pages.map((page) => {
            const filename = page.replace(that.options.pagesFolder + '/', '').replace('/','-').replace('.twig','.html');
            that.addRenderToQueue(
                that,
                compilation,
                page,
                {components: that.components, menu: that.getMenu()},
                `${that.options.outputFolder}/${filename}`,
            );
        });
    };

    /**
     *
     * @param compilation
     */
    renderComponents = function (compilation) {

        const that = this;

        // Return promise with rendered component in config
        const renderComponent = async (template, data) => {
            return new Promise((resolve) => {
                that.renderFilePromise(template, data).then((html) => {
                    resolve({
                        component: html
                    });
                })
            })
        };

        // Loop trough components
        that.components.map(componentData => {

            // Don't continue when component twig file does not exist
            const componentTemplateFileName = componentData.path + '.twig';
            if (!fs.existsSync(componentTemplateFileName)) {
                return false;
            }

            // Parse component properties
            const componentTwigData = {};
            if (componentData.config.hasOwnProperty('properties')) {
                Object.keys(componentData.config.properties).forEach((property) => {
                    componentTwigData[property] = componentData.config.properties[property].default;
                })
            }

            // Parse variants
            if (componentData.config.hasOwnProperty('variants')) {
                Object.keys(componentData.config.variants).forEach((variantId) => {
                    const variant = componentData.config.variants[variantId];
                    const componentVariantTwigData = {...componentTwigData};

                    if (variant.hasOwnProperty('properties')) {
                        Object.keys(variant.properties).forEach(property => {
                            componentVariantTwigData[property] = variant.properties[property];
                        });
                    }

                    that.addRenderToQueue(
                        that,
                        compilation,
                        that.options.componentDisplayTemplateFile,
                        renderComponent(componentTemplateFileName, componentVariantTwigData),
                        `${that.options.outputFolder}/components/${componentData.name.replace('/', '-')}-${variantId}.html`,
                    );
                });

            } else {
                that.addRenderToQueue(
                    that,
                    compilation,
                    that.options.componentDisplayTemplateFile,
                    renderComponent(componentTemplateFileName, componentTwigData),
                    `${that.options.outputFolder}/components/${componentData.name.replace('/', '-')}.html`,
                );
            }


            // Add page render to queue
            that.addRenderToQueue(
                that,
                compilation,
                that.options.pageTemplateFile,
                {componentData: componentData, components: that.components, menu: that.getMenu()},
                `${that.options.outputFolder}/${componentData.name.replace('/', '-')}.html`,
            );
        });
    }

    // Create promise for template render and add to render array
    addRenderToQueue(that, compilation, templateFileName, templateData, outputFileName) {
        const {RawSource} = that.webpack.sources;
        that.renders.push(new Promise((resolveItem, reject) => {

            if (!fs.existsSync(templateFileName)) {
                reject('File does not exist');
            }

            Promise.resolve(templateData).then(function(value) {
                that.renderFilePromise(templateFileName, value).then((html) => {
                    compilation.emitAsset(outputFileName, new RawSource(html));
                    resolveItem();
                }).catch(error => {
                    reject(error);
                })
            }).catch(error => {
                reject(error);
            });
        }).catch(error => {
            console.log('Error: ' + error);
        }));

    }

    async renderFilePromise(templateFileName, templateData) {
        return new Promise((resolve, reject) => {
            Twig.renderFile(templateFileName, templateData, (error, html) => {
                resolve(html);
            });
        });
    }

    /**
     *
     * @param compiler
     */
    apply(compiler) {

        const pluginName = WebpackTwigStyleguide.name;
        const {webpack} = compiler;
        const {Compilation} = webpack;
        const stage = Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL;

        this.webpack = webpack;

        compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
            compilation.hooks.processAssets.tapPromise({name: pluginName, stage: stage}, (assets) => {
                this.components = [];
                this.renders = [];
                this.readConfigs();
                this.clean();


                return new Promise((resolve) => {
                    this.renderComponents(compilation, webpack);
                    this.renderPages(compilation, webpack);

                    Promise.all(this.renders).then(() => {
                        resolve();
                    }).catch(error => {
                        console.log(error);
                    });
                });

            });
        });
    }
}

module.exports = {WebpackTwigStyleguide};
