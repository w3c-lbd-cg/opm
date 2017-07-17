# SEAS FlowSystems API

Install dependencies
`$ npm install`

Compile TypeScript
`$ npm run grunt`

## Starting

To start the server run:

`$ npm start`

To run in dev:
`$ grunt nodemon`

## Database

For the API to work, please have a running Stardog database and specify the configuaration the following way:

1) Make a copy of src/config/_database.ts and name it database.ts
2) Change configuaration
3) Make a copy of src/config/_app.ts and name it app.ts
4) Change configuaration
5) If CORS is needed, also make your own copy of src/config/_cors.ts
6) Recompile

## SSL

As the server is running on HTTPS, a local SSL-certificate must be available when running localhost

1) Get openssl from https://indy.fulgan.com/SSL/
2) Unzip and copy binaries to a local directory (ie. C:/)
3) Add folder to path
4) Follow this to create config file: http://www.flatmtn.com/article/setting-openssl-create-certificates
5) Add passphrase to src/config/app.ts


## Try it out!

1) Create a database for the project
2) Create a heat consumer by POST method to :url/:db/HeatConsumer. Body style:
`{"label": "Heater 1"}`
3) Attach output demand by POST method to :url/:db/HeatConsumer/:guid?property=heatOutput. Body style:
`{"output": "600 W"}`
4) Create a heating system by POST method to :url/:db/HeatingSystem. Body style:
`{"label": "Heating system 1"}`
5) Attach temperature set by POST method to :url/:db/HeatingSystem/:guid?property=temperatureSet. Body style:
`{"t_flow": "55 Cel", "t_return": "35 Cel"}`
6) Make the heat consumer a sub flow system of the heating system by POST method to :url/:db/HeatConsumer/:guid?property=subFlowSystemOf. Body style:
`{"super_system_URI": "https://localhost/seas/HeatingSystem/88d47871-bcf5-480a-831a-f3662b4a8149"}`
7) Attach an external ontology to enable reasoning by POST method to :url/:db/admin/attach. Body style:
`{"named_graph_name": "seas_sys", "graph_url": "w3id.org/seas/SystemOntology-1.0.ttl"}`
8) Attach a rule by POST method to :url/:db/admin/rule. Body style:
`{"label": "TEST RULE", "comment": "Just a test rule", "rule": "PREFIX seas:<https://w3id.org/seas/> IF { ?hc a seas:HeatConsumer } THEN { ?hc seas:test 'just testing' }"}`

# API DOCUMENTATION

**List resource properties**
----
  Returns json data about the feature of interest.

* **URL**

  :db/:foiType/:guid

* **Method:**

  `GET`
  
*  **URL Params**
   
   Query for specific property
   `property=[string]`

   Query only for the latest state
   `latest=[boolean]`

* **Data Params**

  None  

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    ```{ 
        head : {
            vars: [
                "resource",
                "property",
                "value",
                "lastUpdated",
                "g",
                "uri",
                "evaluation",
                "label"
            ]
        },
        results: {
            bindings: [
                {
                    resource: {
                        type: "uri",
                        value: "https://localhost/opm/HeatConsumer/1"
                    },
                    property: {
                        type: "uri",
                        value: "https://w3id.org/seas/heatOutput"
                    },
                    value: {
                        datatype: "http://w3id.org/lindt/custom_datatypes#ucum",
                        type: "literal",
                        value: "600 W"
                    },
                    lastUpdated: {
                        datatype: "http://www.w3.org/2001/XMLSchema#dateTime",
                        type: "literal",
                        value: "2017-07-14T11:13:16.462+02:00"
                    },
                    g: {
                        type: "uri",
                        value: "https://localhost/opm/HVAC"
                    },
                    uri: {
                        type: "uri",
                        value: "https://localhost/opm/Property/3b5b00d8-9bcc-4a58-aba2-df059b5ded97"
                    },
                    evaluation: {
                        type: "uri",
                        value: "https://localhost/opm/State/3b5b00d8-9bcc-4a58-aba2-df059b5ded97"
                    },
                    label: {
                        datatype: "http://www.w3.org/2001/XMLSchema#string",
                        type: "literal",
                        value: "heat output"
                    }
                }
            ]
        }
    }```
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:** `No entity with the specified URI!`

* **Sample Call:**

  ```javascript
    $.ajax({
      url: "/:db/:foiType/:guid",
      dataType: "json",
      type : "GET",
      success : function(r) {
        console.log(r);
      }
    });
  ```

  **Add resource property**
----
  Returns json data about the feature of interest.

* **URL**

  :db/:foiType/:guid

* **Method:**

  `POST`
  
*  **URL Params**

   **Required:**
 
   `property=[string]`

* **Data Params**

  None

* **Body**

  `{
      value: [string]
  }`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    `Successfully added property`
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:** `Error: Does the resource already have the specified property? - if so, do a PUT request instead`

* **Sample Call:**

  ```javascript
    $.ajax({
      url: "/:db/:foiType/:guid?property=:propertyType",
      dataType: "json",
      type : "POST",
      success : function(r) {
        console.log(r);
      }
    });
  ```

    **Update resource property**
----
  Returns json data about the feature of interest.

* **URL**

  :db/:foiType/:guid

* **Method:**

  `PUT`
  
*  **URL Params**

   **Required:**
 
   `property=[string]`

* **Data Params**

  None

* **Body**

  `{
      value: [string]
  }`

* **Success Response:**

  * **Code:** 200 <br />
    **Content:** 
    `Successfully updated property`
 
* **Error Response:**

  * **Code:** 404 NOT FOUND <br />
    **Content:** `No entity with the specified URI!`

  * **Code:** 404 NOT FOUND <br />
    **Content:** `Error: Does the property exist on the resource? - if not, do a POST request instead. Is the value different from last evaluation?`

* **Sample Call:**

  ```javascript
    $.ajax({
      url: "/:db/:foiType/:guid?property=:propertyType",
      dataType: "json",
      type : "POST",
      success : function(r) {
        console.log(r);
      }
    });
  ```