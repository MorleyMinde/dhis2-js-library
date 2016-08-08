angular.module('iroad-relation-modal', [])
    .factory("iRoadModal", function ($http, $q) {
        //var programs = [];
        var dataElements = [];
        var refferencePrefix = "Program_";
        (function fetchPrograms(){

        })();

        $http.get("/" + dhis2.settings.baseUrl + "/api/dataElements.json?fields=id,name,displayName&paging=false").then(function (result) {
            dataElements = result.data.dataElements;
            console.log("DataElements:", dataElements);
        }, function (error) {

        });
        var iRoadModal = {
            programs:[],
            dataElements:[],
            /**
             * Get the Modal name
             *
             * @return string modal name
             */
            getDataElements: function () {
                var deffered = $q.defer();
                if(this.dataElements.length > 0){
                    deffered.resolve(this.dataElements);
                }else{
                    var self = this;
                    $http.get("/" + dhis2.settings.baseUrl + "/api/dataElements.json?fields=id,name,displayName,valueType&paging=false").then(function (result) {
                        self.dataElements = result.data.dataElements;
                        deffered.resolve(self.dataElements);
                    }, function (error) {
                        deffered.reject(error);
                    });
                }
                return deffered.promise;
            },
            /**
             * Get the Modal name
             *
             * @return string modal name
             */
            getPrograms: function () {
                var deffered = $q.defer();
                if(this.programs.length > 0){
                    deffered.resolve(this.programs);
                }else{
                    var self = this;
                    $http.get("/" + dhis2.settings.baseUrl + "/api/programs.json?fields=id,name,displayName,programStages[programStageDataElements[sortOrder,compulsory,dataElement[id,name,valueType,optionSetValue,optionSet[id,name,valueType,options[id,name]],attributeValues[:all]]]]&paging=false").then(function (result) {
                        self.programs = result.data.programs;
                        deffered.resolve(self.programs);
                    }, function (error) {
                        deffered.reject(error);
                    });
                }
                return deffered.promise;
            },
            /**
             * Get a program from the list of dhis2 programs by its name
             *
             * @param string name
             *
             * @return Program
             */
            getProgramByName: function (name) {
                var deffered = $q.defer();
                this.getPrograms().then(function(programs){
                    name = name.replace("_", " ");
                    for (i = 0; i < programs.length; i++) {
                        if (programs[i].name == name) {
                            deffered.resolve(programs[i]);
                        }
                    }
                });
                return deffered.promise;
            },
            /**
             * Get a program from the list of dhis2 programs by its name
             *
             * @param string name
             *
             * @return Program
             */
            getDataElementByName: function (name) {
                var deffered = $q.defer();
                this.getDataElements().then(function(dataElements){
                    name = name.replace("_", " ");
                    for (i = 0; i < dataElements.length; i++) {
                        if (dataElements[i].name == name) {
                            deffered.resolve(dataElements[i]);
                        }
                    }
                });
                return deffered.promise;
            },
            /**
             * Get a data element from the list of dhis2 dataElements by its id
             *
             * @param string id
             *
             * @return dataElement
             */
            getDataElement: function (id) {
                for (i = 0; i < dataElements.length; i++) {
                    if (dataElements[i].id == id) {
                        return dataElements[i];
                    }
                }
            },
            /**
             * Gets all rows of a program
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            getAll: function (modalName,params) {
                var self = this;
                var deffered = $q.defer();
                var promises = [];
                var additionalUrl = "";
                if(params){
                    for(param in params){
                        additionalUrl += "&" + param + "=" + params[param];
                    }
                }
                console.log(additionalUrl)
                this.getProgramByName(modalName).then(function(program){
                    $http.get("/" + dhis2.settings.baseUrl + "/api/events?program=" + program.id + additionalUrl).then(function (result) {
                        var events = [];
                        for (j = 0; j < result.data.events.length; j++) {//For each event render to entity column json
                            var event = result.data.events[j];
                            //Render events to appropriate Modal
                            promises.push(self.renderToJSON(event).then(function (object) {
                                events.push(object);
                            }));
                        }
                        //Check if all results from the server are fetched
                        $q.all(promises).then(function () {
                            deffered.resolve(events);
                        });
                    });
                });

                //Get events of the program from the server

                return deffered.promise;
            },
            /**
             * Search events of a program
             *
             * @param object where (Search criteria)
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            get: function (where, onResult) {
                //Get program by name
                var program = self.getProgramByName(self.modalName);
                // Stores the rows of an entity
                var deffered = $q.defer();
                var promises = [];
                //Get events of the program from the server
                $http.get(dhis2.config.baseUrl + "api/events?program=" + program.id, function (result2) {
                    var events = [];
                    for (j = 0; j < result2.events.length; j++) {//For each event render to entity column json
                        var event = result2.events[j];
                        for (k = 0; k < event.dataValues.length; k++) {
                            if (event.dataValues[k].value == where.value) {//Checks the conditions provided
                                var event = result.events[j];
                                //Render events to appropriate Modal
                                promises.push(self.renderToJSON(event).then(function (object) {
                                    events.push(object);
                                }));
                            }
                        }
                    }
                    $q.all(promises).then(function () {
                        deffered.resolve(events);
                    });
                });
                return deffered.promise;
            },
            /**
             * Find events of a program by id
             *
             * @param string id
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            find: function (uid) {
                var self = this;
                var deffered = $q.defer();
                //Get events of the program from the server
                $http.get("/" + dhis2.settings.baseUrl + "/api/events/" + uid + ".json").then(function (result) {
                    //Render to entity column json
                    self.renderToJSON(result.data).then(function (object) {
                        deffered.resolve(object);
                    });
                }, function (error) {
                    deffered.reject(error);
                });
                return deffered.promise;
            },
            setValue:function(object,dataElement,value){
                return this.find(value).then(function (result) {
                    //Set the field in the json
                    object[dataElement] = result;
                }, function (error) {
                    console.log(error)
                })
            },
            renderToJSON: function (event, relations) {
                var self = this;
                var deffered = $q.defer();
                var promises = [];
                //Object that holds the row data
                this.object = {};
                this.object["id"] = event.event;

                for (k = 0; k < event.dataValues.length; k++) {

                    var dataValue = event.dataValues[k];
                    var dataElement = self.getDataElement(dataValue.dataElement);
                    if (!dataElement.name.startsWith(refferencePrefix)) {//If dataElement is not a foregin key
                        //Set the value in the object
                        this.object[dataElement.name] = dataValue.value;
                    } else {//If dataElement is a foregin key fetch the refferencing program
                        console.log("To set:",dataElement.name);
                        //Remove the refferencePrefix prefix to get the program for reffencing
                        var program = dataElement.name.substring(refferencePrefix.length);
                        //Initialize the Modal from the program name
                        promises.push(this.setValue(self.object,dataElement.name,dataValue.value));
                        /*promises.push(this.find(dataValue.value).then(function (result) {
                            console.log("Being Set:",dataElement.name);
                            //Set the field in the json
                            self.object[dataElement.name] = result;
                        }, function (error) {
                            console.log(error)
                        }));*/
                    }
                }
                //Add relations to the object as specified by the relations
                //
                if (relations)
                    for (k = 0; k < relations.length; k++) {//For each relation

                        var relation = relations[k];
                        var programModal = null;
                        if (relation.type == "ONE_MANY") {//If relationship is one to many
                            programModal = new dhis2.data.Modal(relation.name, []);
                        } else if (relation.type == "MANY_MANY") {//If relationship is many to many
                            //Create modal with one to many relation with the pivot entity
                            programModal = new dhis2.data.Modal(relation.pivot, [{
                                "name": relation.name,
                                "type": "ONE_MANY"
                            }]);
                        }
                        //Initialize the RefferenceProgram from the program name
                        var refProgram = new RefferenceProgram(programModal, dataValue.value);
                        //Override the fetch function to implement a get instead of a find
                        refProgram.fetch = function () {
                            var selfProgram = this;
                            this.program.get({
                                program: self.getModalName(),
                                value: selfrenderToJSON.object.id
                            }, function (result) {
                                selfrenderToJSON.object[selfProgram.program.getModalName()] = result;
                            });
                        }
                        //Push the RefferenceProgram to hel the fetch
                        selfrenderToJSON.count.push(refProgram);
                    }

                $q.all(promises).then(function () {
                    deffered.resolve(self.object);
                }, function (error) {
                    deffered.resolve(self.object);
                });
                return deffered.promise;
            }
        }
        return iRoadModal;
    })