"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const bot_1 = require("./../models/bot");
class BOTRoute extends route_1.BaseRoute {
    static create(router) {
        console.log("[BOTRoute::create] Creating BOT route.");
        router.post("/:db/bot", (req, res, next) => {
            new BOTRoute().uploadToBOT(req, res, next);
        });
        router.post("/:db/botProps", (req, res, next) => {
            new BOTRoute().testing(req, res, next);
        });
    }
    constructor() {
        super();
    }
    uploadToBOT(req, res, next) {
        let bm = new bot_1.BOTModel();
        bm.uploadToBOT(req, res, next);
    }
    testing(req, res, next) {
        let bm = new bot_1.BOTModel();
        bm.uploadProperties(req, res, next);
    }
}
exports.BOTRoute = BOTRoute;
