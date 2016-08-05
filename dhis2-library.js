angular.module('iroad-relation-modal', [])
    .factory("Modal", function ($http, $q) {
        return function (modalName, relations) {
            //Set self to get refference of this object
            self = this;
            //Set the modal name
            this.modalName = modalName;
            //Set relations
            this.relations = relations;
            /**
             * Get the Modal name
             *
             * @return string modal name
             */
            this.getModalName = function () {
                return modalName;
            }
            /**
             * Get a program from the list of dhis2 programs by its name
             *
             * @param string name
             *
             * @return Program
             */
            this.getProgramByName = function (name) {
                name = name.replace("_", " ");
                for (i = 0; i < dhis2.data.programs.length; i++) {
                    if (dhis2.data.programs[i].name == name) {
                        return dhis2.data.programs[i];
                    }
                }
            }
            /**
             * Get a data element from the list of dhis2 dataElements by its id
             *
             * @param string id
             *
             * @return dataElement
             */
            this.getDataElement = function (id) {
                for (i = 0; i < dhis2.data.dataElements.length; i++) {
                    if (dhis2.data.dataElements[i].id == id) {
                        return dhis2.data.dataElements[i];
                    }
                }
            }
            /**
             * Gets all rows of a program
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            this.getAll = function (onResult) {
                //Get program by name
                var program = self.getProgramByName(self.modalName);
                var deffered = $q.defer();
                var promises = [];
                //Get events of the program from the server
                $http.get(dhis2.config.baseUrl + "api/events?program=" + program.id, function (result) {
                    var events = [];
                    for (j = 0; j < result.events.length; j++) {//For each event render to entity column json
                        var event = result.events[j];
                        //Render events to appropriate Modal
                        promises.push(self.renderToJSON(event).then( function (object) {
                            events.push(object);
                        }));
                    }
                    //Check if all results from the server are fetched
                    $q.all(promises).then(function () {
                        deffered.resolve(events);
                    });
                });
                return deffered.promise;
            }
            /**
             * Search events of a program
             *
             * @param object where (Search criteria)
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            this.get = function (where, onResult) {
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
                                promises.push(self.renderToJSON(event).then( function (object) {
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
            }
            /**
             * Find events of a program by id
             *
             * @param string id
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            this.find = function (uid, onResult) {
                var deffered = $q.defer();
                //Get events of the program from the server
                $http.get(dhis2.config.baseUrl + "api/events/" + uid + ".json",
                    function (result) {
                        //Render to entity column json
                        self.renderToJSON(event).then(function (object) {
                            deffered.resolve(object);
                        });
                    });
                return deffered.promise;
            }

            this.renderToJSON = function (event, onSuccess) {
                var deffered = $q.defer();
                //Object that holds the row data
                this.object = {};
                this.count = [];
                var selfrenderToJSON = this;
                //Checks that all requests are made
                this.count = [];
                this.checkAllResultsFetched = function () {
                    if (selfrenderToJSON.count.length > 0) {
                        console.log(JSON.stringify(selfrenderToJSON.count));
                        selfrenderToJSON.count.pop().fetch();
                    } else {
                        onSuccess(selfrenderToJSON.object);
                    }

                }
                /**
                 * Helper to fetch refference program
                 *
                 * @param dhis2.data.Modal programModal
                 *
                 * @param string id
                 */
                var RefferenceProgram = function (programModal, id) {
                    this.program = programModal;
                    this.value = id;
                    this.fetch = function () {

                        var selfProgram = this;
                        //Find the event from the modal being refferenced
                        this.program.find(this.value, function (result) {
                            //Set the field in the json
                            selfrenderToJSON.object[selfProgram.program.getModalName()] = result;

                            //Check if all results from the server are fetched
                            selfrenderToJSON.checkAllResultsFetched();
                        });
                    }
                }
                this.object["id"] = event.event;

                for (k = 0; k < event.dataValues.length; k++) {

                    var dataValue = event.dataValues[k];
                    var dataElement = self.getDataElement(dataValue.dataElement);
                    if (!dataElement.name.startsWith(dhis2.config.refferencePrefix)) {//If dataElement is not a foregin key
                        //Set the value in the object
                        selfrenderToJSON.object[dataElement.name] = dataValue.value;
                    } else {//If dataElement is a foregin key fetch the refferencing program

                        //Remove the refferencePrefix prefix to get the program for reffencing
                        var program = dataElement.name.substring(dhis2.config.refferencePrefix.length);
                        //Initialize the Modal from the program name
                        var programModal = new dhis2.data.Modal(program, []);
                        //Push the RefferenceProgram to hel the fetch
                        selfrenderToJSON.count.push(new RefferenceProgram(programModal, dataValue.value));
                    }
                }
                //Add relations to the object as specified by the relations
                //

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

                            //Check if all results from the server are fetched
                            selfrenderToJSON.checkAllResultsFetched();
                        });
                    }
                    //Push the RefferenceProgram to hel the fetch
                    selfrenderToJSON.count.push(refProgram);
                }
                selfrenderToJSON.checkAllResultsFetched();
                return deffered.promise;
            }
        }
    })