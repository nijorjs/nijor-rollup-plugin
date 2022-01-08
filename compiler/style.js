const fs = require('fs');

async function ReturnStyles(style,scope,options){
    try {
        style = style.replace(/&amp;/g,'&');
        style = await options.Style(style);
        let cssSelectorRegex = /([^\r\n,{}]+)(,(?=[^}]*{)|\s*{)/g;
        let cssSelectors = style.match(cssSelectorRegex);
        try {
            cssSelectors.forEach(child=>{
                if(child.split('')[0]==="@") return;
                if(child.indexOf('[n-scope')==-1){
                    let sub = child.split(' ');
                    for(let i in sub){
                        if(sub[i].lastIndexOf('{')>-1){
                            sub[i] = sub[i].replace('{',`[n-scope="${scope}"]{`);
                        }else if(sub[i].lastIndexOf(',')>-1){
                            sub[i] = sub[i].replace(',',`[n-scope="${scope}"],`);
                        }else{
                            sub[i] = `${sub[i]}[n-scope="${scope}"]`;
                        }

                        if(sub[i].indexOf('::')>-1) {
                            let subOfsub = sub[i].split('::'); 
                            subOfsub[1] = subOfsub[1].replace(`[n-scope="${scope}"]`,'');
                            sub[i] = `${subOfsub[0]}[n-scope="${scope}"]::${subOfsub[1]}`;
                        }
                    }
                    newchild = sub.join(' ');
                    style = style.replace(child,newchild);
                }
            });
        } catch (error) {}
        return style;
    } catch (error) {console.log(error);}
}

async function WriteStyleSheet(doc,scope,options){
    try {
        let style = await ReturnStyles(doc.window.document.querySelector('n-style[dark="false"]').innerHTML,scope,options);
        fs.appendFileSync(options.styleSheet,style);
    } catch (error) {}
    try {
        let CSS = doc.window.document.querySelector('n-style[dark="true"]').innerHTML;
        let style = await ReturnStyles(CSS,scope,options);
        style = options.Style(`body.dark-mode{ ${style} }`);
        fs.appendFileSync(options.styleSheet,style);
    } catch (error) {}
}

module.exports = WriteStyleSheet;