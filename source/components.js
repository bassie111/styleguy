window.components = {};

window.registerComponent = (name, component) => {
    components[name] = component;
};

window.attachComponents = (context) => {
    Object.keys(components).forEach((componentName) => {
        components[componentName].attach(context);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const rootContext = document.documentElement;
    attachComponents(rootContext);
});
