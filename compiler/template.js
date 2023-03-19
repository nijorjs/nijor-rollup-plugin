const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const WriteStyleSheet = require('./style.js');
const GenerateID = require('./uniqueId.js');

let CompileOnEventAttribute = require('./template/on-event.js');
let CompileRouteAttribute = require('./template/n-route.js');

var tmpVar;
let allNijorComponents = [];
let allNijorComponentsMap = {};

function ReturnScripts(doc,PreOrPost){
try {
    const importStatementRegex = /import[^']+(?= from .*).*/gm;
    let script = doc.window.document.querySelector(`script[execute="${PreOrPost}"]`).innerHTML;
    try {
       script.match(importStatementRegex).forEach(element=>{
        script = script.replace(element,'');
    }); 
    }catch(error){}
    return script;
} catch (error) {
    return '';
}
}

function isNijorComponent(element) {
    if(allNijorComponents.includes(element)) return true;
    return false;
}

module.exports = function(doc,scope,ComponentScope,options,specsAttr){

    WriteStyleSheet(doc,scope,options); // write the css file
    
    let template = doc.window.document.querySelector("template").innerHTML;
    let Postscripts = ReturnScripts(doc,'post');
    let Prescripts = ReturnScripts(doc,'pre');

    // Changing the name of the components starts here
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
        // The ComponentScope's value is added after every imported component.
        // Ex :- <header> -> <headervxxh> depending upon ComponentScope
        let OriginalComponentName = child.tagName.toLowerCase();
        let componentName = OriginalComponentName+ComponentScope;
        let cpname = new RegExp('<'+OriginalComponentName,'gim');
        let cpnameClosing = new RegExp('</'+OriginalComponentName+'>','gim');
        template = template.replace(cpname,'<'+componentName);
        template = template.replace(cpnameClosing,'</'+componentName+'>');

        allNijorComponents.push(componentName);
        allNijorComponentsMap[componentName] = OriginalComponentName;
    });
    // Changing the name of the components ends here

    // Compiling {{view}} starts here
    try {
        template.match(/{{(.*)}}/g).forEach(child=>{
            let view_value = child.replace('{{','').replace('}}','').replace(/ /g,'');
            let newValue = `<nijorview view="${view_value}" style="font:inherit;background-color:transparent;"></nijorview>`;
            template = template.replace(child,newValue);
        });
    } catch (error) {}
    // Compiling {{view}} ends here
    
    template = template.replace(/`/g,'\\`');
    template = template.replace(/{/g,'${');
    template = template.replace(/\\\${/g,'\{');
    const VirtualDocument = new JSDOM(template);

    // Adding the n-scope attribute starts here
    VirtualDocument.window.document.body.querySelectorAll('*').forEach((child) => {
        if(child.hasAttribute('n-scope') || child.tagName.toLowerCase()==="nijordata") return;
        child.setAttribute('n-scope',scope);
    });
    // Adding the n-scope attribute ends here

    // Compiling n:route starts here
    tmpVar = CompileRouteAttribute(VirtualDocument);
    VirtualDocument.window.document.body.innerHTML = tmpVar;
    // Compiling n:route ends here

    // Compiling on:{event} starts here
    tmpVar = CompileOnEventAttribute(VirtualDocument,Prescripts,ComponentScope);
    VirtualDocument.window.document.body.innerHTML = tmpVar.VirtualDocument;
    Prescripts = tmpVar.Prescripts;
    // Compiling on:{event} ends here

    // Compiling n:asyncLoad starts here
    VirtualDocument.window.document.body.querySelectorAll('[n:asyncLoad]').forEach(element=>{
        let condition = element.getAttribute('n:asyncLoad');
        element.removeAttribute('n:asyncLoad');
        let innerContent = element.innerHTML;
        var runScript = '';

        let fnName = 'fn_$AsyncLoad__'+GenerateID(3,4)+GenerateID(3,4);
        let eventName = 'asyncload__'+GenerateID(3,4).toLowerCase();

        if(element.hasAttribute('n:reload')){
            element.setAttribute('data-n:asyncLoad',eventName);
        }
        
        element.setAttribute('on:'+eventName,fnName+`(this,${specsAttr})`);
        
        element.querySelectorAll('*').forEach(child=>{
            let elementName = child.tagName.toLowerCase();
            let OriginalComponentName = allNijorComponentsMap[elementName];

            if(isNijorComponent(elementName)){
                runScript += `

                $${OriginalComponentName}.init('${elementName}');
                await $${OriginalComponentName}.run();

                `;
            }

        });

        let fn = `async function ${fnName}(_this,${specsAttr}){
            ${condition}
            _this.innerHTML = \`${innerContent}\`;
            ${runScript}
        }`;

        Prescripts+=fn;
        Postscripts+=`window.nijor.emitEvent('${eventName}',${specsAttr});`;
        element.innerHTML = '';
    });
    // Compiling n:asyncLoad ends here

    // Compiling n:for starts here
    VirtualDocument.window.document.body.querySelectorAll('[n:for]').forEach(element=>{
        let condition = element.getAttribute('n:for');
        element.removeAttribute('n:for');
        
        let innerContent = element.innerHTML;
        var runScript = '';

        let fnName = 'fn_$For__'+GenerateID(3,4)+GenerateID(3,4);
        let eventName = 'for'+GenerateID(3,4).toLowerCase();

        if(element.hasAttribute('n:reload')){
            element.setAttribute('data-n:for',eventName);
        }
        
        element.setAttribute('on:'+eventName,fnName+'(this)');
        
        element.querySelectorAll('*').forEach(child=>{
            let elementName = child.tagName.toLowerCase();
            let OriginalComponentName = allNijorComponentsMap[elementName];

            if(isNijorComponent(elementName)){
                runScript += `

                $${OriginalComponentName}.init('${elementName}');
                await $${OriginalComponentName}.run();

                `;
            }

        });

        let fn = `async function ${fnName}(_this){

            _this.innerHTML = "";

            for(${condition}){
                _this.innerHTML += \`${innerContent}\`;
            }

            ${runScript}
        }`;

        Prescripts+=fn;
        Postscripts+=`window.nijor.emitEvent('${eventName}',null);`;
        element.innerHTML = '';
    });
    // Compiling n:for ends here

    // Compiling n:reload starts here
    VirtualDocument.window.document.body.querySelectorAll('[n:reload]').forEach(element=>{
        let innerContent = element.innerHTML;
        let runScript = '';
        let fnName = 'fn_$'+GenerateID(3,4)+GenerateID(3,4);

        element.setAttribute('on:reload'+element.getAttribute('n:reload'),fnName+'(this)');
        element.removeAttribute('n:reload');

        element.querySelectorAll('*').forEach(child=>{
            let elementName = child.tagName.toLowerCase();
            let OriginalComponentName = allNijorComponentsMap[elementName];
            if(isNijorComponent(elementName)){
                runScript += `

                $${OriginalComponentName}.init('${elementName}');
                await $${OriginalComponentName}.run();

                `;
            }
        });

        if(element.hasAttribute('data-n:for')){

            let forLoopfunc = element.getAttribute('data-n:for');
            element.removeAttribute('data-n:for');
            let fn = `async function ${fnName}(_this){
                window.nijor.emitEvent('${forLoopfunc}',null);
            }`;

            Prescripts+=fn;
            return;
        }

        if(element.hasAttribute('data-n:asyncLoad')){

            let asyncLoadfn = element.getAttribute('data-n:asyncLoad');
            element.removeAttribute('data-n:asyncLoad');
            let fn = `async function ${fnName}(_this){
                window.nijor.emitEvent('${asyncLoadfn}',null);
            }`;

            Prescripts+=fn;
            return;
        }
        let fn = `async function ${fnName}(_this){
            _this.innerHTML = \`${innerContent}\`;
            ${runScript}
        }`;

        Prescripts+=fn;
    });
    // Compiling n:reload ends here

    // Compiling on:{event} starts here
    tmpVar = CompileOnEventAttribute(VirtualDocument,Prescripts,ComponentScope);
    VirtualDocument.window.document.body.innerHTML = tmpVar.VirtualDocument;
    Prescripts = tmpVar.Prescripts;
    // Compiling on:{event} ends here
    
    template = VirtualDocument.window.document.body.innerHTML;
    // template = template.replace(/\s+/g,' ').trim().replace(/>\s+</g, "><");
    return {template,Postscripts,Prescripts};
}