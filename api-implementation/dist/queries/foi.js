"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _s = require("underscore.string");
class FoIQueries {
    checkIfFoIExists(input) {
        const foiURI = input.foiURI;
        const graphURI = input.graphURI ? `<${input.graphURI}>` : '?g';
        var q = '';
        q += 'PREFIX opm: <https://w3id.org/opm#>\n';
        q += 'ASK WHERE {\n';
        q += `\tGRAPH ${graphURI} {\n`;
        q += `\t\t<${foiURI}> ?p ?o .`;
        q += `\t}\n`;
        q += '}';
        return q;
    }
    checkIfFoIDeleted(input) {
        const foiURI = input.foiURI;
        const graphURI = input.graphURI ? `<${input.graphURI}>` : '?g';
        var q = '';
        q += 'PREFIX opm: <https://w3id.org/opm#>\n';
        q += 'ASK WHERE {\n';
        q += `\tGRAPH ${graphURI} {\n`;
        q += `\t\t<${foiURI}> a opm:Deleted .`;
        q += `\t}\n`;
        q += '}';
        return q;
    }
    create(input) {
        const typeURI = input.typeURI;
        const hostURI = input.hostURI;
        const label = input.label;
        const comment = input.comment;
        const userURI = input.userURI;
        const type = _s.strRightBack(typeURI.replace('#', '/'), '/');
        var q = '';
        q += 'PREFIX prov: <http://www.w3.org/ns/prov#>\n';
        q += 'CONSTRUCT {\n';
        q += `\t?foiURI a <${typeURI}> ;\n`;
        q += '\t\tprov:generatedAtTime ?now .\n';
        if (label) {
            q += `\t?foiURI rdfs:label "${label}"^^xsd:string .\n`;
        }
        if (comment) {
            q += `\t?foiURI rdfs:comment "${comment}"^^xsd:string .\n`;
        }
        if (userURI) {
            q += `\t?foiURI prov:wasAttributedTo <${userURI}>\n`;
        }
        q += '}\n';
        q += `WHERE {\n`;
        q += '\t#GENERATE URI FOR NEW CLASS INSTANCE\n';
        q += '\tBIND(REPLACE(STR(UUID()), \"urn:uuid:\", \"\") AS ?guid)\n';
        q += `\tBIND(URI(CONCAT(STR("${hostURI}"), "/${type}/", ?guid)) AS ?foiURI)\n`;
        q += '\t#GET CURRENT TIME\n';
        q += '\tBIND(now() AS ?now)\n';
        q += '}';
        return q;
    }
    update(input) {
        const URI = input.foiURI;
        const userURI = input.userURI;
        const graphURI = input.graphURI;
        const label = input.label;
        const comment = input.comment;
        var q = '';
        q += 'PREFIX opm: <https://w3id.org/opm#>\n';
        q += 'PREFIX prov: <http://www.w3.org/ns/prov#>\n';
        q += `DELETE {\n`;
        q += graphURI ? `\tGRAPH <${graphURI}> {\n` : '\tGRAPH ?g {\n';
        if (label) {
            q += `\t\t#REMOVE THE OLD LABEL\n`;
            q += `\t\t<${URI}> rdfs:label ?oldLabel .\n`;
        }
        if (comment) {
            q += `\t\t#REMOVE THE OLD DESCRIPTION\n`;
            q += `\t\t<${URI}> rdfs:comment ?oldDescription .\n`;
        }
        if (userURI) {
            q += `\t\t#REMOVE THE USER WHO THE FoI IS CURRENTLY ATTRIBUTED TO\n`;
            q += `\t\t<${URI}> prov:wasAttributedTo ?oldUser .\n`;
        }
        q += `\t}\n`;
        q += '}\n';
        if (userURI) {
            q += `INSERT {\n`;
            q += graphURI ? `\tGRAPH <${graphURI}> {\n` : '\tGRAPH ?g {\n';
            if (label) {
                q += `\t\t#ADD NEW LABEL\n`;
                q += `\t\t<${URI}> rdfs:label "${label}"^^xsd:string .\n`;
            }
            if (comment) {
                q += `\t\t#ADD NEW DESCRIPTION\n`;
                q += `\t\t<${URI}> rdfs:comment "${comment}"^^xsd:string .\n`;
            }
            if (userURI) {
                q += `\t\t#ATTRIBUTE THE FoI TO THE CURRENT USER\n`;
                q += `\t\t<${URI}> prov:wasAttributedTo <${userURI}> .\n`;
            }
            q += `\t}\n`;
            q += `}\n`;
        }
        q += `WHERE {\n`;
        q += `\tGRAPH ?g {\n`;
        q += `\t\t<${URI}> ?p ?o .\n`;
        q += `\t\t#MUST NOT BE DELETED\n`;
        q += `\t\tMINUS{<${URI}> a opm:Deleted .}\n`;
        q += `\t\tOPTIONAL{<${URI}> rdfs:label ?oldLabel .}\n`;
        q += `\t\tOPTIONAL{<${URI}> rdfs:comment ?oldDescription .}\n`;
        q += `\t\tOPTIONAL{<${URI}> prov:wasAttributedTo ?oldUser .}\n`;
        q += `\t}\n`;
        q += '}\n';
        return q;
    }
    delete(input) {
        const URI = input.foiURI;
        const userURI = input.userURI;
        const graphURI = input.graphURI;
        var q = '';
        q += 'PREFIX opm: <https://w3id.org/opm#>\n';
        q += 'PREFIX prov: <http://www.w3.org/ns/prov#>\n';
        if (userURI) {
            q += `DELETE {\n`;
            q += graphURI ? `\tGRAPH <${graphURI}> {\n` : '\tGRAPH ?g {\n';
            q += `\t\t#REMOVE THE USER WHO THE FoI IS CURRENTLY ATTRIBUTED TO\n`;
            q += `\t\t<${URI}> prov:wasAttributedTo ?oldUser .\n`;
            q += `\t}\n`;
            q += `}\n`;
        }
        q += `INSERT {\n`;
        q += graphURI ? `\tGRAPH <${graphURI}> {\n` : '\tGRAPH ?g {\n';
        q += `\t\t#ASSIGN OPM:DELETED CLASS\n`;
        q += `\t\t<${URI}> a opm:Deleted .\n`;
        if (userURI) {
            q += `\t\t#ATTRIBUTE THE FoI TO THE CURRENT USER\n`;
            q += `\t\t<${URI}> prov:wasAttributedTo <${userURI}> .\n`;
        }
        q += `\t}\n`;
        q += '}\n';
        q += `WHERE {\n`;
        q += graphURI ? `\tGRAPH <${graphURI}> {\n` : '\tGRAPH ?g {\n';
        q += `\t\t<${URI}> ?p ?o .\n`;
        q += `\t\tOPTIONAL{<${URI}> prov:wasAttributedTo ?oldUser .}\n`;
        q += `\t}\n`;
        q += '}\n';
        return q;
    }
    restore(input) {
        const URI = input.foiURI;
        const graphURI = input.graphURI;
        const userURI = input.userURI;
        var q = '';
        q += 'PREFIX opm: <https://w3id.org/opm#>\n';
        q += 'PREFIX prov: <http://www.w3.org/ns/prov#>\n';
        q += `DELETE {\n`;
        q += graphURI ? `\tGRAPH <${graphURI}> {\n` : '\tGRAPH ?g {\n';
        q += `\t\t<${URI}> a opm:Deleted .\n`;
        if (userURI) {
            q += `\t\t#REMOVE THE USER WHO THE FoI IS CURRENTLY ATTRIBUTED TO\n`;
            q += `\t\t<${URI}> prov:wasAttributedTo ?oldUser .\n`;
        }
        q += `\t}\n`;
        q += '}\n';
        if (userURI) {
            q += `INSERT {\n`;
            q += graphURI ? `\tGRAPH <${graphURI}> {\n` : '\tGRAPH ?g {\n';
            q += `\t\t#ATTRIBUTE THE FoI TO THE CURRENT USER\n`;
            q += `\t\t<${URI}> prov:wasAttributedTo <${userURI}> .\n`;
            q += `\t}\n`;
            q += `}\n`;
        }
        q += `WHERE {\n`;
        q += `\tGRAPH ?g {\n`;
        q += `\t\t#RESOURCE MUST BE DELETED\n`;
        q += `\t\t<${URI}> a opm:Deleted .\n`;
        q += `\t\tOPTIONAL{<${URI}> prov:wasAttributedTo ?oldUser .}\n`;
        q += `\t}\n`;
        q += '}\n';
        return q;
    }
    getAllOfType(input) {
        const typeURI = input.typeURI;
        const graphURI = input.graphURI;
        const restriction = input.restriction;
        const queryType = input.queryType ? input.queryType : 'construct';
        var q = '';
        q += 'PREFIX opm: <https://w3id.org/opm#>\n';
        if (queryType == 'construct') {
            q += 'CONSTRUCT {\n';
            q += `\t?foiURI a ?classes ;\n`;
            q += `\t\trdfs:label ?label ;\n`;
            q += `\t\trdfs:comment ?comment .\n`;
            q += '}\n';
        }
        else {
            q += `SELECT ?foiURI ?label ?comment\n`;
        }
        q += 'WHERE {\n';
        q += graphURI ? `\tGRAPH <${graphURI}> {\n` : '\tGRAPH ?g {\n';
        q += `\t\t?foiURI a <${typeURI}> ;\n`;
        q += `\t\t\ta ?classes ;\n`;
        q += '\t\tOPTIONAL { ?foiURI rdfs:label ?label } .\n';
        q += '\t\tOPTIONAL { ?foiURI rdfs:comment ?comment } .\n\t\t';
        q += (restriction == 'deleted') ? '?foiURI a opm:Deleted' : 'MINUS { ?foiURI a opm:Deleted }';
        q += '\n\t}\n';
        q += '}';
        return q;
    }
}
exports.FoIQueries = FoIQueries;
