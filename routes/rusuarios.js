module.exports = function(app, swig, gestorBD, logger) {

    app.get("/", function (req, res) {
        var respuesta = swig.renderFile('views/bindex.html', {
            userLogged : req.session.usuario
        });
        res.send(respuesta);
    })

    app.get("/usuarios", function(req, res) {
        var criterio = {};
        var criterioPeticiones = {
            $and : [{$or : [{emisor : req.session.usuario}, {amigo : req.session.usuario}]},
                {aceptada : false}]
        };
        var criterioAmigos = {
            $and : [{$or : [{emisor : req.session.usuario}, {amigo : req.session.usuario}]},
                {aceptada : true}]
        };
        var criterioNotificaciones = {
            $and : [{amigo : req.session.usuario}, {aceptada : false}]
        };
        if( req.query.busqueda != null ){
            criterio = {$or : [{nombre : {$regex : ".*"+req.query.busqueda+".*"}},
                    {email : {$regex : ".*"+req.query.busqueda+".*"}}] };
        }
        var pg = parseInt(req.query.pg);
        if ( req.query.pg == null){
            pg = 1;
        }
        gestorBD.obtenerUsuariosPg(criterio, pg , function(usuarios, total ) {
            if (usuarios == null) {
                res.send("/usuarios?mensaje=No hay usuarios");
            } else {
                gestorBD.obtenerInvitaciones(criterioPeticiones, function (peticiones) {
                    gestorBD.obtenerInvitaciones(criterioAmigos, function (amigos) {
                        var pgUltima = total / 5;
                        if (total % 5 > 0) {
                            pgUltima = pgUltima + 1;
                        }
                        gestorBD.obtenerInvitaciones(criterioNotificaciones,function (inv) {
                            var respuesta = swig.renderFile('views/bUsuarios.html',
                                {
                                    usuarios: usuarios,
                                    pgActual: pg,
                                    pgUltima: pgUltima,
                                    userLogged: req.session.usuario,
                                    peticiones: peticiones,
                                    amigos: amigos,
                                    boton: "true",
                                    notificaciones : inv.length
                                });
                            logger.info("Listando usuarios");
                            res.send(respuesta);
                        });
                    });
                });
            }
        });
    });

    app.get("/registrarse", function(req, res) {
        var respuesta = swig.renderFile('views/bregistro.html', {});
        res.send(respuesta);
    });

    app.post("/registrarse", function(req, res) {
        if(req.body.password!=req.body.passwordConfirm){
            res.redirect("/registrarse?mensaje=Las contraseñas deben coincidir");
            return;
        }
        var seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        var usuario = {
            email : req.body.email,
            nombre : req.body.nombre,
            password : seguro,
            lastMessage : 0
        };
        var criterio = { email : req.body.email };
        gestorBD.obtenerUsuarios(criterio, function (usuarioObtenido) {
            if(usuarioObtenido == null || usuarioObtenido.length == 0){
                gestorBD.insertarUsuario(usuario, function(id) {
                    if (id == null){
                        logger.info("Intento de registro fallido");
                        req.session.usuario = null;
                        res.redirect("/registrarse?mensaje=Error")
                    } else {
                        logger.info("Usuario registrado: "+usuario.email);
                        req.session.usuario = usuario.email;
                        res.redirect("/usuarios");
                    }
                });
            }
            else{
                res.redirect('/registrarse?mensaje=El email introducido ya se encuentra en el sistema')
            }
        });

    });

    app.get("/identificarse", function(req, res) {
        var respuesta = swig.renderFile('views/bidentificacion.html', {});
        res.send(respuesta);
    });

    app.post("/identificarse", function(req, res) {
        var seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        var criterio = {
            email : req.body.email,
            password : seguro
        }
        gestorBD.obtenerUsuarios(criterio, function(usuarios) {
            if (usuarios == null || usuarios.length == 0) {
                req.session.usuario = null;
                logger.info("Inicio de sesión inválido");
                res.redirect("/identificarse" +
                    "?mensaje=Email o password incorrecto"+
                    "&tipoMensaje=alert-danger ");
            } else {
                logger.info("Usuario identificado: "+usuarios[0].email);
                req.session.usuario = usuarios[0].email;
                res.redirect("/usuarios");

            }
        });
    });

    app.get('/usuarios/anadir/:email', function(req, res){
        var emisor  = req.session.usuario;
        var emailAmigo = req.params.email;
        var invitacion = {
            emisor : emisor,
            amigo : emailAmigo,
            aceptada : false
        };
        var criterio = {
            $or: [{
                emisor: emisor,amigo: emailAmigo
            },{
                emisor: emailAmigo,amigo: emisor
            }]
        };
        gestorBD.obtenerInvitaciones(criterio, function (invitaciones) {
            if(invitaciones == null || invitaciones.length == 0){
                gestorBD.enviarInvitacion(invitacion, function (idAmigo) {
                    if(idAmigo == null){
                        res.send("Error al añadir amigo");
                    }
                    else{
                        logger.info("Petición de amistad enviada a: "+emailAmigo);
                        res.redirect("/usuarios");
                    }
                })
            }
            else{
                res.redirect('/usuarios?mensaje=No se puede agregar a ese usuario');
            }
        })
    });
    
    app.get('/usuarios/listInvitations', function (req, res) {
        var pg = parseInt(req.query.pg);
        if ( req.query.pg == null){
            pg = 1;
        }
        var criterio = {$and : [{amigo : req.session.usuario}, {aceptada : false}]};
        var criterioNotificaciones = {
            $and : [{amigo : req.session.usuario}, {aceptada : false}]
        };
        gestorBD.obtenerInvitacionesPg(criterio, pg, function(invita, total){
            if (invita == null) {
                res.send("Error al listar ");
            } else {
                var pgUltima = total / 5;
                if (total % 5 > 0) {
                    pgUltima = pgUltima + 1;
                }
                gestorBD.obtenerInvitaciones(criterioNotificaciones,function (peticiones) {
                    var respuesta = swig.renderFile('views/blistInvitations.html',
                        {
                            invitaciones: invita,
                            pgActual: pg,
                            pgUltima: pgUltima,
                            userLogged : req.session.usuario,
                            notificaciones : peticiones.length
                        });
                    logger.info("Listando invitaciones de: "+req.session.usuario);
                    res.send(respuesta);
                });
            }
        })
    });
    app.get('/usuarios/listInvitations/aceptar/:id', function (req, res) {
        var criterio = {
            "_id" : gestorBD.mongo.ObjectID(req.params.id)
        };
        var atributos = {
            aceptada : true,
        }
        gestorBD.aceptarInvitacion(criterio, atributos, function (aceptada) {
            if(aceptada == null){
                res.send("Error al añadir amigo");
            }
            else{
                logger.info("Petición amistad aceptada-Nuevo amigo añadido a: "+req.session.usuario);
                res.redirect('/usuarios/listInvitations');
            }
        })
    });
    app.get('/usuarios/listFriends', function(req, res){
        var criterio = {$and : [{$or : [{emisor : req.session.usuario},
                    {amigo : req.session.usuario}]}, {aceptada : true}]};
        var criterioNotificaciones = {
            $and : [{amigo : req.session.usuario}, {aceptada : false}]
        };
        gestorBD.obtenerInvitaciones(criterio, function (invitaciones) {
            if(invitaciones == null){
                res.send("Error");
            }
            else{
                var usuariosAmigos = [];
                for(i=0; i<invitaciones.length; i++){
                    if(invitaciones[i].amigo == req.session.usuario)
                        usuariosAmigos.push(invitaciones[i].emisor);
                    else
                        usuariosAmigos.push(invitaciones[i].amigo);
                }
                var criterio2 = { email : {$in : usuariosAmigos}};
                var pg = parseInt(req.query.pg);
                if ( req.query.pg == null){
                    pg = 1;
                }
                gestorBD.obtenerUsuariosPg(criterio2, pg, function (usuarios, total) {
                    if (usuarios == null) {
                        res.send("Error al listar ");
                    } else {

                        var pgUltima = total/5;
                        if (total % 5 > 0 ){ // Sobran decimales
                            pgUltima = pgUltima+1;
                        }
                        gestorBD.obtenerInvitaciones(criterioNotificaciones,function (peticiones) {
                            var respuesta = swig.renderFile('views/listFriends.html',
                                {
                                    usuarios : usuarios,
                                    pgActual : pg,
                                    pgUltima : pgUltima,
                                    userLogged : req.session.usuario,
                                    notificaciones : peticiones.length
                                });
                            logger.info("Listando amigos de: "+req.session.usuario);
                            res.send(respuesta);
                        });
                    }
                });
            }
        })
    })
    app.get('/desconectarse', function (req, res) {
        logger.info("Usuario desconectado: "+req.session.usuario);
        req.session.usuario = null;
        res.redirect("/identificarse");
    })
};