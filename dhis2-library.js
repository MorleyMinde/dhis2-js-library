angular.module('iroad-relation-modal', [])
    .factory("iRoadModal", function ($http, $q, ProgramFactory, DHIS2EventFactory, MetaDataFactory) {
        //var initialPromise = downloadMetaData();
        var loaded = false;
        var iRoadModal = {
            refferencePrefix: "Program_",
            programs: [],
            dataElements: [],
            downloadMetaData: function () {
                var deffered = $q.defer();
                var promise = deffered.promise;
                if (loaded) {
                    deffered.resolve();
                } else {


                    promise = promise.then(dhis2.ec.store.open);
                    promise = promise.then(getUserRoles);
                    promise = promise.then(getCalendarSetting);
                    promise = promise.then(getConstants);
                    promise = promise.then(getOrgUnitLevels);
                    promise = promise.then(getMetaPrograms);
                    promise = promise.then(filterMissingPrograms);
                    promise = promise.then(getPrograms);
                    promise = promise.then(getOptionSetsForDataElements);
                    promise = promise.then(getOptionSets);
                    promise = promise.then(getDataElements);
                    promise.then(function () {
                        alert("")
                        loaded = true;
                        deffered.resolve();
                        dhis2.availability.startAvailabilityCheck();
                    });
                }
                return promise;
            },
            /**
             * Get the Modal name
             *
             * @return string modal name
             */
            getUser: function () {
                var deffered = $q.defer();
                if (this.user) {
                    deffered.resolve(this.user);
                } else {
                    var self = this;
                    $http.get("/" + dhis2.settings.baseUrl + "/api/me.json").then(function (result) {
                        self.user = result.data;
                        deffered.resolve(self.user);
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
            getDataElements: function () {
                var deffered = $q.defer();
                if (this.dataElements.length > 0) {
                    deffered.resolve(this.dataElements);
                } else {
                    var self = this;
                    MetaDataFactory.getAll("dataElements").then(function (results) {
                        self.dataElements = results;
                        deffered.resolve(self.dataElements);
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
                if (this.programs.length > 0) {
                    deffered.resolve(this.programs);
                } else {
                    var self = this;
                    this.getUser().then(function (user) {
                        ProgramFactory.getProgramsByOu(user.organisationUnits[0]).then(function (results) {
                            self.programs = results.programs;
                            deffered.resolve(self.programs);
                        }, function (error) {
                            deffered.reject(error);
                        })
                    }, function (error) {
                        deffered.reject(error);
                    })
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
                this.getPrograms().then(function (programs) {
                    name = name.replace("_", " ");
                    for (var i = 0; i < programs.length; i++) {
                        if (programs[i].displayName == name) {
                            deffered.resolve(programs[i]);
                            return;
                        }
                    }
                    deffered.reject({
                        status: "Program Unknown",
                        title: "Program Unknown",
                        message: "The program with name " + name + " specified does not exist."
                    });
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
                this.getDataElements().then(function (dataElements) {
                    name = name.replace("_", " ");
                    for (i = 0; i < dataElements.length; i++) {
                        if (dataElements[i].name == name) {
                            deffered.resolve(dataElements[i]);
                            return;
                        }
                    }
                    deffered.reject({
                        title: "Data Element Unknown",
                        status: "Data Element Unknown",
                        message: "The data element with name " + name + " specified does not exist."
                    });
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
                var deffered = $q.defer();
                this.getDataElements().then(function (dataElements) {
                    for (i = 0; i < dataElements.length; i++) {
                        if (dataElements[i].id == id) {
                            deffered.resolve(dataElements[i]);
                            return;
                        }
                    }
                    deffered.reject({
                        title: "Data Element Unknown",
                        status: "Data Element Unknown",
                        message: "The data element with id " + id + " specified does not exist."
                    });
                });
                return deffered.promise;
            },
            /**
             * Gets all rows of a program
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            getAll: function (modalName, params) {
                var self = this;
                var deffered = $q.defer();
                var promises = [];
                self.getProgramByName(modalName).then(function (program) {
                    self.getUser().then(function (user) {
                        DHIS2EventFactory.getByStage(user.organisationUnits[0].id, program.programStages[0].id).then(function (results) {
                            deffered.resolve(results.events);
                        }, function (error) {
                            deffered.reject(error);
                        })
                    }, function (error) {
                        deffered.reject(error);
                    })
                })

                return deffered.promise;
            },
            setDataValueToEvent: function (dataValue) {
                return DHIS2EventFactory.get(dataValue.value).then(function (event) {
                    dataValue.value = event;
                })
            },
            /**
             * Search events of a program
             *
             * @param object where (Search criteria)
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            getRelations: function (event) {
                // Stores the rows of an entity
                var deffered = $q.defer();
                var self = this;
                var promises = [];
                this.getDataElements().then(function (dataElements) {
                    dataElements.forEach(function (dataElement) {
                        event.dataValues.forEach(function (dataValue) {
                            if (dataElement.id == dataValue.dataElement && dataElement.displayName.startsWith(self.refferencePrefix)) {
                                promises.push(self.setDataValueToEvent(dataValue))
                            }
                        })
                    })
                    $q.all(promises).then(function () {
                        deffered.resolve(event);
                    }, function (error) {
                        deffered.resolve(event);
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
            setValue: function (object, dataValue) {
                var self = this;
                var deffered = $q.defer();
                this.getDataElement(dataValue.dataElement).then(function (dataElement) {
                    if (!dataElement.name.startsWith(self.refferencePrefix)) {//If dataElement is not a foregin key
                        //Set the value in the object
                        object[dataElement.name] = dataValue.value;
                        deffered.resolve(object);
                    } else {
                        self.find(dataValue.value).then(function (result) {
                            //Set the field in the json
                            object[dataElement.name] = result;
                            deffered.resolve(object);
                        }, function (error) {
                            deffered.resolve(error);
                        })
                    }
                });
                return deffered.promise;
            },
            renderToJSON: function (event, relations) {
                var self = this;
                var deffered = $q.defer();
                var promises = [];
                //Object that holds the row data
                this.object = {};
                this.object["id"] = event.event;

                event.dataValues.forEach(function (dataValue) {
                    promises.push(self.setValue(self.object, dataValue));
                })
                //Add relations to the object as specified by the relations
                if (relations) {
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
                }

                $q.all(promises).then(function () {
                    deffered.resolve(self.object);
                }, function (error) {
                    deffered.resolve(self.object);
                });
                return deffered.promise;
            },
            save: function (programName, object) {
                var deffered = $q.defer();
                var self = this;
                this.getUser().then(function (user) {
                    var event = {
                        orgUnit: user.organisationUnits[0].id,
                        storedBy: user.userCredentials.username,
                        status: "COMPLETED",
                        dataValues: []
                    };
                    self.getProgramByName(programName).then(function (program) {
                        event.program = program.id;
                        program.programStages[0].programStageDataElements.forEach(function (programStageDataElement) {
                            if (object[programStageDataElement.dataElement.name]) {
                                event.dataValues.push({
                                    dataElement: programStageDataElement.dataElement.id,
                                    value: object[programStageDataElement.dataElement.name]
                                });
                            }
                        });
                        if (object.id) {
                            $http.put("/" + dhis2.settings.baseUrl + "/api/events/" + object.id, event).then(function (results) {
                                deffered.resolve(results);
                            }, function (error) {
                                deffered.reject(error);
                            })
                        } else {
                            $http.post("/" + dhis2.settings.baseUrl + "/api/events", event).then(function (results) {
                                deffered.resolve(results);
                            }, function (error) {
                                deffered.reject(error);
                            })
                        }
                    })
                })
                return deffered.promise;
            }
        }
        return iRoadModal;
    })