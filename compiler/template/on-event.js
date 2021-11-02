function ParseOnEvent(VirtualDocument,Prescripts,ComponentScope){
    VirtualDocument.window.document.querySelectorAll('*').forEach(child=>{
        let allAttributes = child.getAttributeNames().filter(element=>element.indexOf('on:')>-1); // Getting all the attribute names of the tag ang and filtering the attributes which start with "on:"
            allAttributes.forEach(elem=>{
                    let fnAttr = child.getAttribute(elem);
                    let fnAttrWithoutReturnStatement = fnAttr.replace('return ','');
                    let willFunctionReturn = false;
                    let fnargs = fnAttr.split('(');
                    let fnName = fnargs[0].replace('return ','');

                    if(fnargs[0].includes('return ')){
                        willFunctionReturn = true;
                    }

                    let newFuncName = '_'+ComponentScope+fnName;
                    let newFuncNameCall = '_'+ComponentScope+fnAttrWithoutReturnStatement;
                  
                    let event = elem.replace(':','');

                    if(willFunctionReturn===true){
                        child.setAttribute(event,`return window.nijorfunc.${newFuncNameCall}`);
                    }else{
                        child.setAttribute(event,`window.nijorfunc.${newFuncNameCall}`);
                    }
                    let fnscripts = `window.nijorfunc["${newFuncName}"]=${fnName};`;
                    child.removeAttribute(elem);
                    let newPrescript = Prescripts+fnscripts;
                    Prescripts = newPrescript;
        });
    });
    return({
        VirtualDocument:VirtualDocument.window.document.body.innerHTML,Prescripts
    });
}

module.exports = ParseOnEvent;