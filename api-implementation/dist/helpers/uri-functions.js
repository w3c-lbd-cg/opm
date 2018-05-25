"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid = require('uuid/v4');
const app_1 = require("./../config/app");
const protocol = app_1.AppConfig.protocol;
class UriFunctions {
    constructor(req, identifier) {
        this.db = req.params.db;
        this.guid = uuid();
        this.host = req.headers.host.split(':')[0];
        this.type = identifier;
    }
    newUri() {
        return `${protocol}://${this.host}/${this.db}/${this.type}/${this.guid}`;
    }
    graphUri() {
        return `${protocol}://${this.host}/${this.db}/${this.type}`;
    }
}
exports.UriFunctions = UriFunctions;
