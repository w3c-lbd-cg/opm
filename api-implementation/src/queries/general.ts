import * as moment from "moment";
import { endsWith } from "underscore.string";

export class GeneralQueries {

    /**
     * NAMED GRAPHS
     * @method getAllNamedGraphs() //Returns all named graphs in the database
     * @method getResourceNamedGraph(resourceURI) //Returns the named graph to which a resource belongs
     */

    getAllNamedGraphs(): string {
        return "SELECT DISTINCT ?g WHERE { GRAPH ?g {?s ?p ?o}}";
    }

    getResourceNamedGraph(resourceURI): string {
        return `SELECT DISTINCT ?g WHERE { GRAPH ?g {<${resourceURI}> ?p ?o}}`;
    }

    addObjectProperty(subjectURI, predicateURI, objectURI, graphURI): string {
        return `INSERT DATA {GRAPH <${graphURI}> {<${subjectURI}> <${predicateURI}> <${objectURI}>}}`;
    }

    checkIfResourceExists(resourceURI) {
        var q = '';
        q+= 'ASK WHERE {\n';
        q+= `\t{ GRAPH ?g {<${resourceURI}> ?p ?o} }\n`;
        q+= '\tUNION\n';
        q+= `\t{ <${resourceURI}> ?p ?o }\n`;
        q+= '}';
        return q;
    }

    checkIfPropertyExistOnResource(resourceURI,propertyURI): string{
        return `ASK WHERE {GRAPH ?g {<${resourceURI}> <${propertyURI}> <?o>}}`;
    }

    wipeNamedGraph(graphURI): string {
        return `DELETE WHERE {GRAPH <${graphURI}> {?s ?p ?o}}`;
    }

    wipeAll(): string {
        return `DELETE WHERE {GRAPH ?g {?s ?p ?o}}`;
    }

}