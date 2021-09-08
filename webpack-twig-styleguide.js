const fs = require("fs");
const Twig = require("twig"),
    twig = Twig.twig;

class WebpackTwigStyleguide {

    static defaultOptions = {
        pageTemplateFile: './templates/page.twig',
        componentsFolder: './components'
    };

    components = [];


    constructor(options = {}) {
        this.options = {...WebpackTwigStyleguide.defaultOptions, ...options};
    }

    walk = function (dir) {
        const that = this;
        var results = [];
        var list = fs.readdirSync(dir);
        list.forEach(function (file) {
            file = dir + '/' + file;
            var stat = fs.statSync(file);
            if (stat && stat.isDirectory()) {
                results = results.concat(that.walk(file));
            } else {
                if (file.indexOf('component.json') > 0) {
                    results.push(file);
                }
            }
        });
        return results;
    }

    /**
     *
     */
    readConfigs = function () {
        const that = this;
        const files = this.walk(this.options.componentsFolder);

        // Build index
        files.forEach((componentConfigFile) => {
            const componentConfig = JSON.parse(fs.readFileSync(componentConfigFile));

            //Add global data for overview
            that.components.push({
                name: componentConfig.name,
                config: componentConfig,
                path: componentConfigFile.replace('.component.json', '')
            });
        });
    };

    /**
     *
     * @param compilation
     */
    renderTwigFiles = function (compilation, webpack) {

        const that = this;
        const {Compilation} = webpack;
        const {RawSource} = webpack.sources;


        const pageTwigString = fs.readFileSync(this.options.pageTemplateFile);
        const pageTwigTemplate = Twig.twig({
            data: pageTwigString.toString()
        });

        this.components.forEach((componentData) => {
            const componentTwigFileName = componentData.path + '.twig';

            if (!fs.existsSync(componentTwigFileName)) {
                return false;
            }

            const componentTwigFileContent = fs.readFileSync(componentTwigFileName);
            const template = Twig.twig({
                data: componentTwigFileContent.toString()
            });
            const componentTwigData = {};

            Object.keys(componentData.config.properties).forEach((property) => {
                componentTwigData[property] = componentData.config.properties[property].default;
            })

            const renderedElement = template.render(componentTwigData);
            const renderedPage = pageTwigTemplate.render({
                component: renderedElement,
                elements: that.elements
            });

            compilation.emitAsset(
                './styleguide/components/' + componentData.name.replace('/', '-') + '.html',
                new RawSource(renderedElement)
            );

            compilation.emitAsset(
                './styleguide/' + componentData.name.replace('/', '-') + '.html',
                new RawSource(renderedPage)
            );
        });
    };

    /**
     *
     * @param compiler
     */
    apply(compiler) {

        const pluginName = WebpackTwigStyleguide.name;
        const {webpack} = compiler;
        const {Compilation} = webpack;
        const stage = Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE;

        compiler.hooks.thisCompilation.tap(pluginName, (compilation) => {
            // Tapping to the assets processing pipeline on a specific stage.
            compilation.hooks.processAssets.tap({name: pluginName, stage: stage}, (assets) => {
                this.readConfigs();
                this.renderTwigFiles(compilation, webpack);
            });
        });
    }
}

module.exports = {WebpackTwigStyleguide};
