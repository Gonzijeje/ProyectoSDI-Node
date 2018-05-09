module.exports = function(app, swig, gestorBD) {

    app.get("/", function (req, res) {
        var respuesta = swig.renderFile('views/bindex.html', {
            userLogged : req.session.usuario
        });
        res.send(respuesta);
    })

    app.get("/usuarios", function(req, res) {
        var criterio = {};
        if( req.query.busqueda != null ){
            criterio = {$OR : [{"nombre" : {$regex : ".*"+req.query.busqueda+".*"}},
                    {"email" : {$regex : ".*"+req.query.busqueda+".*"}}] };
        }
        var pg = parseInt(req.query.pg); // Es String !!!
        if ( req.query.pg == null){ // Puede no venir el param
            pg = 1;
        }
        gestorBD.obtenerUsuariosPg(criterio, pg , function(usuarios, total ) {
            if (usuarios == null) {
                res.send("Error al listar ");
            } else {

                var pgUltima = total/5;
                if (total % 5 > 0 ){ // Sobran decimales
                    pgUltima = pgUltima+1;
                }

                var respuesta = swig.renderFile('views/bUsuarios.html',
                    {
                        usuarios : usuarios,
                        pgActual : pg,
                        pgUltima : pgUltima,
                        userLogged : req.session.usuario
                    });
                res.send(respuesta);
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
            passwordConfirm : seguro
        }
        var criterio = {
            email : req.body.email,
        }
        gestorBD.obtenerUsuarios(criterio, function(usuarios) {
            if (usuarios.length > 0) {
                res.redirect("/registrarse?mensaje=El usuario ya está registrado")
            } else {
                gestorBD.insertarUsuario(usuario, function (id) {
                    if (id == null) {
                        res.redirect("/registrarse?mensaje=El usuario ya está registrado")
                    } else {
                        req.session.usuario = usuario.email;
                        res.redirect("/usuarios");
                    }
                });
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
                res.redirect("/identificarse" +
                    "?mensaje=Email o password incorrecto"+
                    "&tipoMensaje=alert-danger ");
            } else {
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
        }
        gestorBD.añadirAmigo(invitacion, function (idAmigo) {
            if(idAmigo == null){
                res.send("Error al añadir amigo");
            }
            else{
                res.redirect("/usuarios");
            }
        })
    });
    
    app.get('/usuarios/listInvitations', function (req, res) {
        var pg = parseInt(req.query.pg);
        if ( req.query.pg == null){
            pg = 1;
        }
        var criterio = {$and : [{amigo : req.session.usuario}, {aceptada : false}]};
        gestorBD.obtenerInvitacionesPg(criterio, pg, function(invita, total){
            if (invita == null) {
                res.send("Error al listar ");
            } else {
                var pgUltima = invita.length / 5;
                if (invita.length % 5 > 0) {
                    pgUltima = pgUltima + 1;
                }
                var respuesta = swig.renderFile('views/blistInvitations.html',
                    {
                        invitaciones: invita,
                        pgActual: pg,
                        pgUltima: pgUltima,
                        userLogged : req.session.usuario
                    });
                res.send(respuesta);
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
                res.redirect('/usuarios/listInvitations');
            }
        })
    });
    app.get('/usuarios/listFriends', function(req, res){
        var criterio = {$and : [{$or : [{emisor : req.session.usuario}, {amigo : req.session.usuario}]}, {aceptada : true}]};
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

                        var respuesta = swig.renderFile('views/listFriends.html',
                            {
                                usuarios : usuarios,
                                pgActual : pg,
                                pgUltima : pgUltima,
                                userLogged : req.session.usuario
                            });
                        res.send(respuesta);
                    }
                });
            }
        })
    })
    app.get('/desconectarse', function (req, res) {
        req.session.usuario = null;
        res.send("Usuario desconectado");
    })
};