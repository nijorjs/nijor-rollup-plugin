const { createFilter } = require('@rollup/pluginutils');
const jsdom = require("jsdom");
const path = require("path");
const { JSDOM } = jsdom;
const chalk = require('chalk');
const GenerateID = require('./uniqueId.js');
const TemplateLoader = require('./template.js');

const extensionColorMap = {
  '.nijor':'#40e249',
  '.js':'#fffb0e',
  'default':'#ff73f8'
};

function returnScriptsContent(doc,execute){
    try {
        let script = doc.window.document.querySelector('script[execute="'+execute+'"]').innerHTML;
        return script;
    } catch (error) {
        return '';
    }
}
function ReturnScripts(doc,execute){
  try {
    const importStatementRegex = /import[^']+(?= from .*).*/gm;
    let script = returnScriptsContent(doc,execute);
    let ImportStatements;
    try {
        ImportStatements = script.match(importStatementRegex).join('');
    } catch (error) {
        ImportStatements = '';
    }
    try {
       script.match(importStatementRegex).forEach(element=>{
        script = script.replace(element,'');
    }); 
    }catch(error){}
    return {ImportStatements,script};
  } catch (error) {
    return {ImportStatements:'',script:''};
  }
  
}
function ReturnModule(doc){
    /* convert the component imports to javascript imports
    Ex:- <header n:imported="components/header"> will convert to 
          import $header from "components/header";
    */
    let Mod = [];
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
        let componentVar = '$'+child.tagName.toLowerCase();
        let from = child.getAttribute('n:imported')+'.nijor';
        Mod.push(`import ${componentVar} from "${from}";`);
    });
    return Mod.join('');
}
function ReturnRunModule(doc,ComponentScope){
    let Mod = [];
    doc.window.document.querySelectorAll("[n:imported]").forEach(child=>{
    let componentVar = '$'+child.tagName.toLowerCase();
    let OriginalComponentName = child.tagName.toLowerCase();
    let componentName = OriginalComponentName+ComponentScope;
    /* 
    get the ComponentScope
    Change the name of the im
    Call the run function on the imported components.
    $header.init('header'+ComponentScope);
    $header.run();
    */
    Mod.push(`
            ${componentVar}.init('${componentName}');
            await ${componentVar}.run();
          `);
    });
    return Mod.join('');
}
function NijorCompiler(options) {
  let opts = { include: '**/*.nijor' };
  const filter = createFilter(opts.include, opts.exclude);
  return {
  name: "nijorCompile",

    async transform(code, id) {
      let componentName = id.replace('/','\\');
      componentName = id.split('\\');
      componentName = componentName.reverse();

      {
        let msg; 
        try{
          msg = chalk.rgb(0, 195, 255)(`Nijor: `)+chalk.hex(extensionColorMap[path.extname(id)])(`Compiling ${componentName[0]} .`);
        }catch{
          msg = chalk.rgb(0, 195, 255)(`Nijor: `)+chalk.hex(extensionColorMap['default'])(`Compiling ${componentName[0]} .`);
        }
        console.log(msg);
      }
      
      if (filter(id)) {

        let newCode = code.replace(new RegExp('<style','g'),'<n-style');
        newCode = newCode.replace(new RegExp('</style','g'),'</n-style');

        const VirtualDocument = new JSDOM(newCode);
        const specsAttr = VirtualDocument.window.document.querySelector('template').getAttribute('specs') || '';
        try {
          VirtualDocument.window.document.querySelectorAll('script').forEach(child=>{
          if(child.hasAttribute('defer')){
            child.setAttribute('execute','post');
          }
          if(child.hasAttribute('mid')){
            child.setAttribute('execute','mid');
          }
          if(child.getAttribute('execute')==="post" || child.getAttribute('execute')==="mid") return;
          child.setAttribute('execute','pre');
          });
        } catch (error) {}

        try {
          VirtualDocument.window.document.querySelectorAll('n-style').forEach(child=>{
          if(child.hasAttribute('dark')){
            child.setAttribute('dark','true');
            return;
          }
          child.setAttribute('dark','false');
          });
        } catch (error) {}

        const scope = GenerateID(6,20);
        const ComponentScope = GenerateID(2,5).toLowerCase();
        const {template,Postscripts,Prescripts} = TemplateLoader(VirtualDocument,scope,ComponentScope,options);
        const importStatementsPre =  ReturnScripts(VirtualDocument,'pre').ImportStatements;
        const importStatementsPost =  ReturnScripts(VirtualDocument,'post').ImportStatements;
        const midScript = ReturnScripts(VirtualDocument,'mid').script;
        const NijorComponentClass = ' __Nijor_ComponentClass'+GenerateID(3,9);
        let mod = ReturnModule(VirtualDocument);
        let runmod = ReturnRunModule(VirtualDocument,ComponentScope);
            return {
                code: `
                  import ${NijorComponentClass} from 'nijor/components';
                  ${mod}
                  ${importStatementsPre}
                  ${importStatementsPost}
                  ${Prescripts}
                  export default new ${NijorComponentClass}(async function(${specsAttr}){
                      ${midScript}
                      return(\`${template}\`);
                  },async function()
                  {${runmod}
                  ${Postscripts}
                });
                `,
                map: { mappings: "" }
            };
      }
    }
  };
}
module.exports = NijorCompiler;