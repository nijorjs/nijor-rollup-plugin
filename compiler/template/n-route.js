
function Route(VirtualDocument){
    VirtualDocument.window.document.body.querySelectorAll('a[n:route]').forEach(child=>{
        let route = child.getAttribute('n:route');
        child.removeAttribute('n:route');
        child.setAttribute('onclick',`return window.nijor.redirect('${route}')`);
        child.setAttribute('href',route);
    });
    return VirtualDocument.window.document.body.innerHTML;
}

module.exports = Route;