// Módulos
var express = require('express');
var app = express();

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "POST, GET, DELETE, UPDATE, PUT");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, token");
    next();
});

var expressSession = require('express-session');
app.use(expressSession({
    secret: 'abcdefg',
    resave: true,
    saveUninitialized: true
}));

var jwt = require('jsonwebtoken');
app.set('jwt',jwt);

const log4js = require('log4js');
log4js.configure({
    appenders: { proyectoSDI: { type: 'file', filename: 'proyectoSDI.log' } },
    categories: { default: { appenders: ['proyectoSDI'], level: 'info' } }
});

const logger = log4js.getLogger('proyectoSDI');


var crypto = require('crypto');

var fileUpload = require('express-fileupload');
app.use(fileUpload());
var mongo = require('mongodb');
var swig = require('swig');
var bodyParser = require('body-parser');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

var gestorBD = require("./modules/gestorBD.js");
gestorBD.init(app,mongo);

// routerUsuarioToken
var routerUsuarioToken = express.Router();
routerUsuarioToken.use(function(req, res, next) {
    // obtener el token, puede ser un parámetro GET , POST o HEADER
    var token = req.body.token || req.query.token || req.headers['token'];
    if (token != null) {
        // verificar el token
        jwt.verify(token, 'secreto', function(err, infoToken) {
            if (err || (Date.now()/1000 - infoToken.tiempo) > 240 ){
                res.status(403); // Forbidden
                res.json({
                    acceso : false,
                    error: 'Token invalido o caducado'
                });
                // También podríamos comprobar que intoToken.usuario existe
                return;

            } else {
                // dejamos correr la petición
                res.usuario = infoToken.usuario;
                next();
            }
        });

    } else {
        res.status(403); // Forbidden
        res.json({
            acceso : false,
            mensaje: 'No hay Token'
        });
    }
});
// Aplicar routerUsuarioToken
app.use('/api/usuarios', routerUsuarioToken);
app.use('/api/mensajes', routerUsuarioToken);

// routerUsuarioSession
var routerUsuarioSession = express.Router();
routerUsuarioSession.use(function(req, res, next) {
    console.log("routerUsuarioSession");
    if ( req.session.usuario ) {
        // dejamos correr la petición
        next();
    } else {
        res.redirect("/identificarse");
    }
});
//Aplicar routerUsuarioSession
app.use("/usuarios",routerUsuarioSession);

app.use(express.static('public'));

// Variables
app.set('port', 8081);
//app.set('db','mongodb://admin:sdi@ds241489.mlab.com:41489/tiendamusica');
app.set('db','mongodb://admin:sdi@ds255329.mlab.com:55329/proyectosdi-node');
app.set('clave','abcdefg');
app.set('crypto',crypto);

//Rutas/controladores por lógica
require("./routes/rusuarios.js")(app, swig,gestorBD,logger); // (app, param1, param2, etc.)
require("./routes/rapiusuarios.js")(app, gestorBD,logger);


app.get('/resetBD', function (req, res) {
    gestorBD.resetBD();
    res.redirect("/registrarse?mensaje=La base de datos ha sido reseteada");
});

app.use( function (err, req, res, next ) {
    console.log("Error producido: " + err); //we log the error in our db
    if (! res.headersSent) {
        res.status(400);
        res.send("Recurso no disponible");
    }
});

// lanzar el servidor
app.listen(app.get('port'), function() {
    console.log("Servidor activo");
});