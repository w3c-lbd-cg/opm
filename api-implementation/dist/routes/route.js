"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class BaseRoute {
    constructor() {
        this.scripts = [];
    }
    addScript(src) {
        this.scripts.push(src);
        return this;
    }
    render(req, res, data) {
        res.setHeader('Content-Type', 'text/html');
        res.locals.scripts = this.scripts;
        data ? this.jsonData = data : this.jsonData = "Success";
        res.send(this.jsonData);
    }
}
exports.BaseRoute = BaseRoute;
