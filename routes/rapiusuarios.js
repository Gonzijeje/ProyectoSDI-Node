module.exports = function(app, gestorBD) {


    //S1
    app.post("/api/autenticar", function(req, res) {
        var seguro = app.get("crypto").createHmac('sha256', app.get('clave'))
            .update(req.body.password).digest('hex');
        var criterio = {
            email : req.body.email,
            password : seguro
        }
        gestorBD.obtenerUsuarios(criterio, function(usuarios) {
            if (usuarios == null || usuarios.length == 0) {
                res.status(401); // Unauthorized
                res.json({
                    autenticado : false
                })
            } else {
                var token = app.get('jwt').sign(
                    {usuario: criterio.email , tiempo: Date.now()/1000},
                    "secreto");
                res.status(200);
                res.json({
                    autenticado : true,
                    token : token
                })
            }
        });
    });

    //S2
    app.get("/api/usuarios", function(req, res) {
        var emailEmisor = res.usuario;
        console.log("Email emisor" + emailEmisor);
        var criterio = {
            $and: [{
                $or: [{emisor: emailEmisor }, {amigo: emailEmisor}]
            },{
                aceptada:true
            }]
        };
        gestorBD.obtenerInvitaciones( criterio , function(invitaciones) {
            if (invitaciones == null) {
                console.log("Inivtaciones falla");
                res.status(500);
                res.json({
                    error : "se ha producido un error"
                })
            } else{
                var usuariosAmigos = [];
                for(i=0; i<invitaciones.length; i++){
                    if(invitaciones[i].amigo == emailEmisor)
                        usuariosAmigos.push(invitaciones[i].emisor);
                    else
                        usuariosAmigos.push(invitaciones[i].amigo);
                }
                var criterio2 = { email : {$in : usuariosAmigos}};
                gestorBD.obtenerUsuarios(criterio2, function(usuarios) {
                    if (usuarios == null) {
                        console.log("Usuarios falla");
                        res.status(500);
                        res.json({
                            error : "se ha producido un error"
                        })
                    } else {
                        res.status(200);
                        res.send( JSON.stringify(usuarios) );
                    }
                });
            }
        });
    });

    //S3
    app.post("/api/mensajes", function(req, res) {
        var emailEmisor = res.usuario;
        var emailAmigo = req.body.destino;
        var criterio = {
            $and: [{
                $or: [{
                    emisor: emailEmisor, amigo: emailAmigo
                }, {
                    emisor: emailAmigo, amigo: emailEmisor
                }]
            },{
                aceptada:true
            }]
        };
        gestorBD.obtenerInvitaciones(criterio, function (invitaciones) {
            if (invitaciones.length > 0) {
                var mensaje = {
                    emisor: res.usuario,
                    destino: req.body.destino,
                    texto: req.body.texto,
                    leido: false
                };

                gestorBD.insertarMensaje(mensaje, function (idMensaje) {
                    if (idMensaje == null) {
                        res.status(500);
                        res.json({
                            error: "se ha producido un error"
                        })
                    } else {
                        res.status(201);
                        res.json({
                            mensaje: "mensaje insertardo",
                            _id: idMensaje
                        });
                    }
                });

            } else{
                res.status(500);
                res.json({
                    error: "el usuario emisor "+ emailEmisor+", y el usuario destino "+emailAmigo+" " +
                    "no son amigos."
                })
            }
        });
    });

    //S4
    app.get("/api/mensajes", function(req, res) {
        var emailEmisor = res.usuario;
        var emailAmigo = req.query.destino;
        var criterio = {
            $or: [{
                emisor: emailEmisor,destino: emailAmigo
            },{
                emisor: emailAmigo,destino: emailEmisor
            }]
        };
        gestorBD.obtenerMensajes( criterio , function(mensajes) {
            if (mensajes == null) {
                res.status(500);
                res.json({
                    error : "se ha producido un error"
                })
            } else {
                res.status(200);
                res.send( JSON.stringify(mensajes) );
            }
        });
    });

    //S5
    app.put('/api/mensajes/:id', function (req, res) {
        var criterio = {"_id" : gestorBD.mongo.ObjectID(req.params.id)
        };
        var atributos = {
            leido : true,
        }
        gestorBD.obtenerMensajes( criterio , function(mensajes) {
            if (mensajes == null || mensajes.length == 0) {
                res.status(400);
                res.json({
                    error : "no existe mensaje con este identificador: " + req.params.id
                })
            } else {
                if(mensajes.destino != res.usuario){
                    res.status(403);
                    res.json({
                        error: "es necesario ser destinatario del mensaje para poder leerlo"
                    });
                }else {
                    gestorBD.leerMensaje(criterio, atributos, function (leida) {
                        if (leida == null) {
                            res.status(500);
                            res.json({
                                error: "se ha producido un error"
                            })
                        }
                        else {
                            res.status(200);
                            res.json({
                                error: "mensaje leído con éxito"
                            })
                        }
                    })
                }
            }
        });
    });

};