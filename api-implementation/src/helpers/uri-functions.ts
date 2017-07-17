import { Request } from "express";
const uuid = require('uuid/v4');

export class UriFunctions {
    
    private db: string;
    private guid: string;
    private host: string;
    private type: string;
    
    constructor(req: Request, identifier: string){
        this.db = req.params.db;
        this.guid = uuid();
        this.host = req.headers.host.split(':')[0]; //Get host without port number
        this.type = identifier;
    }
    
    newUri(){
        return `https://${this.host}/${this.db}/${this.type}/${this.guid}`;
    }

    graphUri(){
        return `https://${this.host}/${this.db}/${this.type}`;
    }

}