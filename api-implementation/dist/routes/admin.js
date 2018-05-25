"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const route_1 = require("./route");
const admin_1 = require("./../models/admin");
class AdminRoute extends route_1.BaseRoute {
    static create(router) {
        console.log("[AdminRoute::create] Creating admin route.");
        router.post("/:db/admin/postTriples", (req, res, next) => {
            new AdminRoute().postQuery(req, res, next);
        });
        router.post("/:db/admin/getTriples", (req, res, next) => {
            new AdminRoute().getQuery(req, res, next);
        });
        router.delete("/:db/admin/wipe", (req, res, next) => {
            new AdminRoute().wipeDB(req, res, next);
        });
        router.post("/:db/admin/externalOntology", (req, res, next) => {
            new AdminRoute().attachOntology(req, res, next);
        });
        router.put("/:db/admin/externalOntology/:name", (req, res, next) => {
            new AdminRoute().reloadOntology(req, res, next);
        });
        router.delete("/:db/admin/externalOntology/:name", (req, res, next) => {
            new AdminRoute().detachOntology(req, res, next);
        });
        router.get("/:db/admin/externalOntologies", (req, res, next) => {
            new AdminRoute().listOntologies(req, res, next);
        });
        router.post("/:db/admin/namespace", (req, res, next) => {
            new AdminRoute().addNamespace(req, res, next);
        });
        router.put("/:db/admin/namespace", (req, res, next) => {
            new AdminRoute().updateNamespace(req, res, next);
        });
        router.delete("/:db/admin/namespace/:prefix", (req, res, next) => {
            new AdminRoute().removeNamespace(req, res, next);
        });
        router.get("/:db/admin/namespaces", (req, res, next) => {
            new AdminRoute().getNamespaces(req, res, next);
        });
        router.get("/:db/admin/rules", (req, res, next) => {
            new AdminRoute().listRules(req, res, next);
        });
        router.post("/:db/admin/rule", (req, res, next) => {
            new AdminRoute().addRule(req, res, next);
        });
        router.delete("/:db/admin/rule", (req, res, next) => {
            new AdminRoute().deleteRule(req, res, next);
        });
    }
    constructor() {
        super();
    }
    postQuery(req, res, next) {
        console.time("postQuery");
        let am = new admin_1.AdminModel();
        am.postQuery(req)
            .then(function (data) {
            console.timeEnd("postQuery");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    getQuery(req, res, next) {
        console.time("getQuery");
        let am = new admin_1.AdminModel();
        am.getQuery(req)
            .then(function (data) {
            console.timeEnd("getQuery");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    wipeDB(req, res, next) {
        console.time("wipeDB");
        let am = new admin_1.AdminModel();
        am.wipeDB(req)
            .then(function (data) {
            console.timeEnd("wipeDB");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    attachOntology(req, res, next) {
        console.time("attachOntology");
        let am = new admin_1.AdminModel();
        am.attachOntology(req)
            .then(function (data) {
            console.timeEnd("attachOntology");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    reloadOntology(req, res, next) {
        console.time("reloadOntology");
        let am = new admin_1.AdminModel();
        am.reloadOntology(req)
            .then(function (data) {
            console.timeEnd("reloadOntology");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    detachOntology(req, res, next) {
        console.time("detachOntology");
        let am = new admin_1.AdminModel();
        am.detachOntology(req)
            .then(function (data) {
            console.timeEnd("detachOntology");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    listOntologies(req, res, next) {
        console.time("listOntologies");
        let am = new admin_1.AdminModel();
        am.listOntologies(req)
            .then(function (data) {
            console.timeEnd("listOntologies");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    addNamespace(req, res, next) {
        console.time("addNamespace");
        let am = new admin_1.AdminModel();
        am.addNamespace(req)
            .then(function (data) {
            console.timeEnd("addNamespace");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    updateNamespace(req, res, next) {
        console.time("updateNamespace");
        let am = new admin_1.AdminModel();
        am.updateNamespace(req)
            .then(function (data) {
            console.timeEnd("updateNamespace");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    removeNamespace(req, res, next) {
        console.time("removeNamespace");
        let am = new admin_1.AdminModel();
        am.removeNamespace(req)
            .then(function (data) {
            console.timeEnd("removeNamespace");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    getNamespaces(req, res, next) {
        console.time("getNamespaces");
        let am = new admin_1.AdminModel();
        am.getNamespaces(req)
            .then(function (data) {
            console.timeEnd("getNamespaces");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    listRules(req, res, next) {
        console.time("listRules");
        let am = new admin_1.AdminModel();
        am.listRules(req)
            .then(function (data) {
            console.timeEnd("listRules");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    addRule(req, res, next) {
        console.time("addRule");
        let am = new admin_1.AdminModel();
        am.addRule(req)
            .then(function (data) {
            console.timeEnd("addRule");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
    deleteRule(req, res, next) {
        console.time("deleteRule");
        let am = new admin_1.AdminModel();
        am.deleteRule(req)
            .then(function (data) {
            console.timeEnd("deleteRule");
            res.send(data);
        })
            .catch(function (err) {
            next(err);
        });
    }
}
exports.AdminRoute = AdminRoute;
