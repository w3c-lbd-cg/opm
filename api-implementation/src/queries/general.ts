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

    addProjectData(uri, name, description?): string {
        var q = '';
        q+= 'PREFIX doap: <http://usefulinc.com/ns/doap#>\n';
        q+= 'INSERT {\n';
        q+= `\t<${uri}> a foaf:Project , prov:Entity , doap:Project ;\n`;
        q+= `\t\trdfs:label "${name}" ;\n`;
        q+= `\t\tdoap:name "${name}" ;\n`;
        q+= `\t\tdoap:created ?now .\n`;
        if(description){
            q+= `\t<${uri}> rdfs:comment "${description}" ;\n`;
            q+= `\t\tdoap:description "${description}" ;\n`;
        }
        q+= '} WHERE {\n';
        q+= '\tBIND(now() AS ?now)\n';
        q+= '}';
        return q;
    }

    getProjectData(): string {
        var q = '';
        q+= 'PREFIX doap: <http://usefulinc.com/ns/doap#>\n';
        q+= 'PREFIX rvt:  <http://example.org/rvt#>\n';
        q+= 'CONSTRUCT {\n';
        q+= '\t?proj a ?class ;\n';
        q+= '\t\tdoap:name ?name ;\n';
        q+= '\t\tdoap:created ?created ;\n';
        q+= '\t\tdoap:description ?description ;\n';
        q+= '\t\trvt:bucketKey ?bucketKey ;\n';
        q+= '\t\trvt:objectKey ?objectKey .\n';
        q+= '}\n';
        q+= 'WHERE {\n';
        q+= '\t?proj a foaf:Project ;\n';
        q+= '\t\tdoap:name ?name ;\n';
        q+= '\t\tdoap:created ?created .\n';
        q+= '\t\tOPTIONAL { ?proj doap:description ?description . }\n';
        q+= '\t\tOPTIONAL { ?proj rvt:bucketKey ?bucketKey . }\n';
        q+= '\t\tOPTIONAL { ?proj rvt:objectKey ?objectKey . }\n';
        q+= '}';
        return q;
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