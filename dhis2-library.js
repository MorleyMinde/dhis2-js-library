angular.module('iroad-relation-modal', [])
    .factory("iRoadModal", function ($http, $q, ProgramFactory, DHIS2EventFactory, MetaDataFactory, FileService, toaster) {
        downloadMetaData();
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
                        loaded = true;
                        deffered.resolve();
                        dhis2.availability.startAvailabilityCheck();
                    });
                }
                return promise;
            },
            createColumns: function(programStageDataElements,noAction) {
                var cols = [];
                if (programStageDataElements){
                    programStageDataElements.forEach(function (programStageDataElement) {
                        var filter = {};
                        filter[programStageDataElement.dataElement.name.replace(" ","")] = 'text';
                        cols.push({
                            field: programStageDataElement.dataElement.name.replace(" ",""),
                            title: programStageDataElement.dataElement.name,
                            headerTitle: programStageDataElement.dataElement.name,
                            show: programStageDataElement.displayInReports,
                            sortable: programStageDataElement.dataElement.name.replace(" ",""),
                            filter: filter
                        });
                    })
                }
                if(!noAction){
                    cols.push({
                        field: "",
                        title: "Action",
                        headerTitle: "Action",
                        show: true
                    });
                }
                return cols;
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
            getProgramById: function (id) {
                var deffered = $q.defer();
                this.getPrograms().then(function (programs) {
                    for (var i = 0; i < programs.length; i++) {
                        if (programs[i].id == id) {
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
            getRelationship: function (dataElementName) {
                var deffered = $q.defer();

                this.getProgramByName(dataElementName.replace(iRoadModal.refferencePrefix, "")).then(function (program) {
                    program.programStages[0].programStageDataElements.forEach(function (programStageDataElement) {
                        if (programStageDataElement.dataElement.code)
                            if (programStageDataElement.dataElement.code.toLowerCase() == ("id_" + dataElementName.replace(iRoadModal.refferencePrefix, "").toLowerCase())) {
                                deffered.resolve(programStageDataElement.dataElement);
                            }
                    })
                })
                return deffered.promise;
            },
            getRelationshipDataElementByProgram: function (dataElementName, program) {
                var deffered = $q.defer();
                program.programStages[0].programStageDataElements.forEach(function (programStageDataElement) {
                    if (programStageDataElement.dataElement.name == dataElementName) {
                        deffered.resolve(programStageDataElement.dataElement);
                    }
                });
                return deffered.promise;
            },
            /**
             * Gets all rows of a program
             *
             * @param function onResult (Callback after the result is returned)
             *
             */
            getAll: function (modalName, pager) {
                var self = this;
                var deffered = $q.defer();
                self.getProgramByName(modalName).then(function (program) {
                    self.getUser().then(function (user) {
                        DHIS2EventFactory.getByStage(user.organisationUnits[0].id, program.programStages[0].id,"",pager,pager).then(function (results) {
                            if(pager){
                                deffered.resolve(results);
                            }else{
                                deffered.resolve(results.events);
                            }
                            return results.events;
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
                var deffered = $q.defer();
                DHIS2EventFactory.get(dataValue.value).then(function (event) {
                    dataValue.value = event;
                    deffered.resolve();
                }, function () {
                    dataValue.value = {};
                    deffered.resolve();
                })
                return deffered.promise;
            },
            setEventToDataValue: function (dataElement, dataValuePassed) {

                var deffered = $q.defer();
                this.getRelationship(dataElement.displayName).then(function (relationDataElement) {
                    dataValuePassed.value.dataValues.some(function (eventDataValue) {
                        if (relationDataElement.id == eventDataValue.dataElement) {
                            dataValuePassed.value = eventDataValue.value;
                            return true;
                        }
                    })
                    deffered.resolve();
                });
                return deffered.promise;
            },
            initiateEvent: function (event, program) {
                var self = this;
                var deffered = $q.defer();
                if (program) {
                    this.getProgramById(program.id).then(function (program) {
                        var dataValuesToAdd = [];
                        program.programStages[0].programStageDataElements.forEach(function (programStageDataElement) {
                            var found = false;
                            if (event.dataValues) {
                                event.dataValues.forEach(function (dataValue) {
                                    if (programStageDataElement.dataElement.id == dataValue.dataElement) {
                                        found = true;
                                    }
                                });
                            } else {
                                event.dataValues = [];
                            }
                            if (!found) {
                                dataValuesToAdd.push({dataElement: programStageDataElement.dataElement.id, value: ""})
                            }
                        });
                        dataValuesToAdd.forEach(function (dataValueToAdd) {
                            event.dataValues.push(dataValueToAdd);
                        })
                        self.getRelations(event).then(function (newEvent) {
                            deffered.resolve(newEvent);
                        })
                    })
                } else {
                    self.getRelations(event).then(function (newEvent) {
                        deffered.resolve(newEvent);
                    })
                }
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
            getRelatedEvent: function (event,program) {
                // Stores the rows of an entity
                var deffered = $q.defer();
                var self = this;
                var promises = [];
                this.getDataElements().then(function (dataElements) {
                    dataElements.forEach(function (dataElement) {
                        event.dataValues.forEach(function (dataValue) {
                            if (dataElement.id == dataValue.dataElement && dataElement.displayName == self.refferencePrefix + program.displayName) {
                                if(dataValue.value != ""){
                                    DHIS2EventFactory.get(dataValue.value).then(function (event) {
                                        deffered.resolve(event);
                                    }, function () {
                                        deffered.resolve({});
                                    });
                                }
                                promises.push(self.setDataValueToEvent(dataValue))
                            }
                        })
                    })
                    $q.all(promises).then(function () {

                    }, function (error) {
                        deffered.resolve(event);
                    });
                });

                return deffered.promise;
            },
            getFileUrl: function (event, dataElement) {
                return "/" + dhis2.settings.baseUrl + "/api/events/files?eventUid=" + event.event + "&dataElementUid=" + dataElement.id;
            },
            setRelations: function (event) {
                // Stores the rows of an entity
                var deffered = $q.defer();
                var self = this;
                var promises = [];
                this.getDataElements().then(function (dataElements) {
                    dataElements.forEach(function (dataElement) {
                        event.dataValues.forEach(function (dataValue) {
                            if (dataElement.id == dataValue.dataElement && dataElement.displayName.startsWith(self.refferencePrefix)) {
                                dataValue.value = dataValue.value.event;
                                //promises.push(self.setEventToDataValue(dataElement,dataValue));
                            } else if (dataElement.id == dataValue.dataElement && dataElement.valueType == "DATE" && dataValue.value != "") {
                                dataValue.value = new Date(dataValue.value);
                                var month = dataValue.value.getMonth() + 1;
                                var date = dataValue.value.getDate();
                                dataValue.value = dataValue.value.getFullYear() + "-" + (month < 10 ? "0" + month : month) + "-" + (date < 10 ? "0" + date : date);
                            }
                        })
                    });
                    $q.all(promises).then(function () {
                        deffered.resolve(event);
                    }, function (error) {
                        deffered.reject(error);
                    });
                });

                return deffered.promise;
            },
            getRelatedPrograms: function (programName) {
                var deffered = $q.defer();
                this.getPrograms().then(function (programs) {
                    var relatedPrograms = [];
                    programs.forEach(function (program) {
                        program.programStages[0].programStageDataElements.some(function (programStageDataElement) {
                            if (programStageDataElement.dataElement.name == iRoadModal.refferencePrefix + programName) {
                                relatedPrograms.push(program);
                                return true;
                            }
                        })
                    })
                    deffered.resolve(relatedPrograms);
                })
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
            find: function (program, dataElement, value) {
                var self = this;
                var deffered = $q.defer();
                //Get events of the program from the server
                $http.get("/" + dhis2.settings.baseUrl + "/api/sqlViews.json?filter=name:eq:Find Event").then(function (result) {
                    //Render to entity column json
                    $http.get("/" + dhis2.settings.baseUrl + "/api/sqlViews/" + result.data.sqlViews[0].id + "/data.json?var=dataElement:" + dataElement + "&var=value:" + value).then(function (result) {
                        var eventIDs = [];
                        result.data.rows.forEach(function (row) {
                            eventIDs.push(row[0]);
                        });
                        if (eventIDs.length == 0) {
                            deffered.resolve([]);
                        } else {
                            $http.get("/" + dhis2.settings.baseUrl + "/api/events.json?program=" + program + "&event=" + eventIDs.join(";")).then(function (result) {
                                deffered.resolve(result.data.events);
                            }, function (error) {
                                deffered.reject(error);
                            });
                        }

                    }, function (error) {
                        deffered.reject(error);
                    });
                }, function (error) {
                    deffered.reject(error);
                });
                return deffered.promise;
            },
            transformToEvents: function (data) {
                var eventData = {
                    events: []
                }
                data.rows.forEach(function (row) {
                    var event = {};
                    row.forEach(function (column, index) {
                        if (data.headers[index].column == "longitude" || data.headers[index].column == "latitude") {
                            if (!event.coordinate) {
                                event.coordinate = {}
                            }
                            event.coordinate[data.headers[index].column] = column;
                        } else if (data.headers[index].column == "dataValues") {
                            event[data.headers[index].column] = eval("(" + column + ")");
                        } else {
                            event[data.headers[index].column] = column;
                        }

                    })
                    eventData.events.push(event);
                })
                return eventData;
            },
            get: function (modalName, params) {
                var self = this;
                var deffered = $q.defer();
                self.getProgramByName(modalName).then(function (program) {
                    self.getUser().then(function (user) {
                        DHIS2EventFactory.getByStage(user.organisationUnits[0].id, program.programStages[0].id).then(function (results) {
                            if (params.filter) {
                                var events = [];
                                results.events.forEach(function (event) {
                                    event.dataValues.some(function (dataValue) {
                                        if (dataValue.dataElement == params.filter.left) {
                                            if (params.filter.operator == "EQ" && dataValue.value == params.filter.right) {
                                                events.push(event);
                                                return true;
                                            } else if (params.filter.operator == "LIKE" && dataValue.value.indexOf(params.filter.right) > -1) {
                                                events.push(event);
                                                return true;
                                            }
                                        }
                                    })
                                })
                                deffered.resolve(events);
                            } else {
                                deffered.resolve(results.events);
                            }
                        }, function (error) {
                            deffered.reject(error);
                        })
                    }, function (error) {
                        deffered.reject(error);
                    })
                })

                return deffered.promise;
            },
            save: function (event, program) {
                var deffered = $q.defer();
                var self = this;
                this.setRelations(event).then(function (newEvent) {
                    if (newEvent.event) {
                        DHIS2EventFactory.update(newEvent).then(function (results) {
                            toaster.pop('success', "Saved successfully", program.displayName + " was successfully saved.");
                            deffered.resolve(newEvent);
                        }, function (error) {
                            toaster.pop('error', "Failure", program.displayName + " failed to save. Please try again");
                            deffered.reject(error);
                        })
                    } else {
                        newEvent.program = program.id;
                        self.getUser().then(function (user) {
                            newEvent.orgUnit = user.organisationUnits[0].id;
                            newEvent.eventDate = new Date();
                            newEvent.storedBy = user.userCredentials.username;
                            newEvent.status = "COMPLETED";
                            DHIS2EventFactory.create(newEvent).then(function (results) {
                                newEvent.event = results.response.importSummaries[0].reference;
                                toaster.pop('success', "Saved successfully", program.displayName + " was successfully saved.");
                                deffered.resolve(newEvent);
                            }, function (error) {
                                toaster.pop('error', "Failure", program.displayName + " failed to save. Please try again");
                                deffered.reject(error);
                            })
                        })
                    }

                })
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
            deleteEvent : function(event){
                var deffered = $q.defer();
                DHIS2EventFactory.delete(event).then(function(){
                    deffered.resolve();
                },function(){
                    deffered.reject();
                });
                return deffered.promise;
            }
        };
        return iRoadModal;
    });