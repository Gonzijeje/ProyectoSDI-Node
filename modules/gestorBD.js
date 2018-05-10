module.exports = {
    mongo : null,
    app : null,
    init : function(app, mongo) {
        this.mongo = mongo;
        this.app = app;
    },
    obtenerUsuariosPg : function(criterio,pg,funcionCallback){
        this.mongo.MongoClient.connect(this.app.get('db'), function(err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('usuarios');
                collection.count(criterio, function(err, count){
                    collection.find(criterio).skip( (pg-1)*5 ).limit( 5 )
                        .toArray(function(err, usuarios) {
                            if (err) {
                                funcionCallback(null);
                            } else {
                                funcionCallback(usuarios, count);
                            }
                            db.close();
                        });
                });
            }
        });
    },
    
    obtenerInvitaciones: function(criterio, functionCallback){
        this.mongo.MongoClient.connect(this.app.get('db'), function(err, db) {
            if (err) {
                functionCallback(null);
            } else {
                var collection = db.collection('amigos');
                collection.find(criterio).toArray(function(err, invitaciones) {
                    if (err) {
                        functionCallback(null);
                    } else {
                        functionCallback(invitaciones);
                    }
                    db.close();
                });
            }
        });
    },
    obtenerInvitacionesPg: function(criterio, pg, functionCallback){
        this.mongo.MongoClient.connect(this.app.get('db'), function(err, db) {
            if (err) {
                functionCallback(null);
            } else {
                var collection = db.collection('amigos');
                collection.count(criterio, function(err, count){
                    collection.find(criterio).skip( (pg-1)*5 ).limit( 5 ).toArray(function(err, invitaciones) {
                        if (err) {
                            functionCallback(null);
                        } else {
                            functionCallback(invitaciones, count);
                        }
                        db.close();
                    });
                });

            }
        });
    },
    enviarInvitacion: function(amigo, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function(err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('amigos');
                collection.insert(amigo, function(err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    },
    aceptarInvitacion: function(criterio, atributos, funcionCallback){
        this.mongo.MongoClient.connect(this.app.get('db'), function(err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('amigos');
                collection.update(criterio, {$set: atributos}, function (err, obj) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(obj);
                    }
                    db.close();
                });
            }
        });
    },
    insertarUsuario : function(usuario, funcionCallback) {
        this.mongo.MongoClient.connect(this.app.get('db'), function(err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('usuarios');
                collection.insert(usuario, function(err, result) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(result.ops[0]._id);
                    }
                    db.close();
                });
            }
        });
    },
    obtenerUsuarios : function(criterio,funcionCallback){
        this.mongo.MongoClient.connect(this.app.get('db'), function(err, db) {
            if (err) {
                funcionCallback(null);
            } else {
                var collection = db.collection('usuarios');
                collection.find(criterio).toArray(function(err, usuarios) {
                    if (err) {
                        funcionCallback(null);
                    } else {
                        funcionCallback(usuarios);
                    }
                    db.close();
                });
            }
        });
    }

};