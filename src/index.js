const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require("@whiskeysockets/baileys")
const fs = require("fs");
// conctando con mongoose
const mongoose = require('mongoose');
mongoose.connect('mongodb://127.0.0.1:27017/chatbot-test');
const Contacto = mongoose.model('Contacto', { nombre: String, numero: String });




async function conectarWhatsapp(){

    const {state, saveCreds } = await useMultiFileAuthState('sesion_whatsapp_baileys');

    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: true
    });

    sock.ev.on('connection.update', (update) => {

        const {connection, lastDisconnect} = update;
        if(connection === 'close'){
            const shouldReconnect = (lastDisconnect.error)?.output?.statusCode !== DisconnectReason.loggedOut
            console.log('CONEXION CERRADA due to ', lastDisconnect.error, ', reconnecting ', shouldReconnect)
            if(shouldReconnect){
                conectarWhatsapp()
            }

        }else if(connection === 'open'){
            console.log('CONEXION ABIERTA')
        }
    });

    sock.ev.on('messages.upsert', async (event) => {
        console.log(JSON.stringify(event, undefined, 2));

        const message = event.messages[0];
        if(message.key.fromMe && event.type != 'notify'){
            return;
        }
// 59178844793
        const id = event.messages[0].key.remoteJid;
        const nombre = event.messages[0].pushName;
        const mensaje = event.messages[0].message?.conversation ||
                        event.messages[0].message?.extendedTextMessage?.text ||
                        event.messages[0].message?.text;
        
        const con = new Contacto({ nombre: nombre, numero:id });
        con.save().then(() => console.log('Contacto registrado...'));

        // leer mensaje
        await sock.readMessages([event.messages[0].key]);

        // esperando 
        await sleep(200)

        // animacion escribiendo
        await sock.sendPresenceUpdate("composing", id)
        await sleep(3000)

        // enviar mensaje de Texto
        await sock.sendMessage(id, {text: "Hola Soy un BOT"});

        // mensaje de respuesta
        await sock.sendMessage(id, {text: "Hola "+nombre+", gracias por escribir."}, {quoted: event.messages[0]})
        
        // mencionar
        await sock.sendMessage(
            id,
            {
                text: 'Hola saludos @59173277937',
                mentions: ['59173277937@s.whatsapp.net']
            }
        );

        // enviar ubicacion
        await sock.sendMessage(id, {location: {address: 'Av 123, Z. ABC',degreesLatitude: 24.121231, degreesLongitude: 55.1121221} })

        // contacto
        const vcard = 'BEGIN:VCARD\n' // metadata of the contact card
            + 'VERSION:3.0\n' 
            + 'FN:Jeff Singh\n' // full name
            + 'ORG:Ashoka Uni;\n' // the organization of the contact
            + 'TEL;type=CELL;type=VOICE;waid=911234567890:+91 12345 67890\n' // WhatsApp ID + phone number
            + 'END:VCARD'

        await sock.sendMessage(
            id,
            { 
                contacts: { 
                    displayName: 'Jeff', 
                    contacts: [{ vcard }] 
                }
            }
        )

        // enviar reaccion
        await sock.sendMessage(
            id,
            {
                react: {
                    text: '💖', // use an empty string to remove the reaction
                    key: event.messages[0].key
                }
            }
        );
        
        // enviar mensaje con vista previa
        await sock.sendMessage(id, {text: "Hola Soy un BOT visitanos: https://github.com/cchura94"});

        // enviar videos
        await sock.sendMessage(
            id, 
            { 
                video: fs.readFileSync('Media/mi-video.mp4'),
                // caption: 'hello word',
                // gifPlayback: true
            }
        )

        // enviar videos con descripcion
        await sock.sendMessage(
            id, 
            { 
                video: fs.readFileSync('Media/mi-video.mp4'),
                caption: 'Hola este es mi nuevo *VIDEO*\nvea el video completo y dame una respuesta.\n\no escribenos.',
                // gifPlayback: true
            }
        );

        // enviar video gif
        await sock.sendMessage(
            id, 
            { 
                video: fs.readFileSync('Media/mi-video.mp4'),
                gifPlayback: true
            }
        )

        // enviar videos ptv
        await sock.sendMessage(
            id, 
            { 
                video: fs.readFileSync('Media/mi-video.mp4'),
                ptv: true
            }
        );

        // audios
        await sock.sendMessage(id, {audio: {url: "./Media/mi-audio.mp3"}, mimetype: 'audio/mp4', ptt:true})

        // imagenes
        await sock.sendMessage(id, {image: {url: "https://www.mikeelectronica.com/cdn/shop/articles/B-MK_02_2121x.progressive.jpg?v=1607535378"}})

    })


    sock.ev.on('creds.update', saveCreds)
}

conectarWhatsapp()

function sleep(ms){
    return new Promise((res) => setTimeout(res, ms));
}