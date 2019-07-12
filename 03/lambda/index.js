// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK (v2).
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const Alexa = require('ask-sdk');
const modules = require('./modules');
var persistenceAdapter = getPersistenceAdapter();

const LaunchRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'LaunchRequest';
    },
    handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        let vueltas = sessionAttributes['vueltas'];
        let speechText;
        if(vueltas){
            speechText = 'Hola otra vez! Eres muy valiente en continuar. ';
        } else {
            speechText = 'Bienvenido a sí mi capitán! ';
            sessionAttributes['id'] = 1;
            sessionAttributes['reputacion'] = 50;
            sessionAttributes['tesoro'] = 50;
            sessionAttributes['vueltas'] = 0;
            
        }
        const module = getModule(sessionAttributes['id']);
        if(module)
            speechText += module.question;
        else
            speechText += 'Lamentablemente hubo un error al acceder a la historia. Dí para y luego vuelve a abrir la skill';
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withStandardCard('Sí mi Capitán', module.question, module.image)
            .getResponse();
    }
};

const YesHandler = {
    canHandle(handlerInput){
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
    },
    handle(handlerInput){
        return responseLoopHandler(handlerInput, 'yes');
    }
}

const NoHandler = {
    canHandle(handlerInput){
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
    },
    handle(handlerInput){
        return responseLoopHandler(handlerInput, 'no');
    }
}

const HelpIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.HelpIntent';
    },
    handle(handlerInput) {
        const speechText = 'Solo tienes que contestar si o no durante el juego. Elige con sabiduría!';

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

const CancelAndStopIntentHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && (handlerInput.requestEnvelope.request.intent.name === 'AMAZON.CancelIntent'
                || handlerInput.requestEnvelope.request.intent.name === 'AMAZON.StopIntent');
    },
    async handle(handlerInput) {
        const {attributesManager} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        
        const speechText = `Has durado ${sessionAttributes['vueltas']} turnos. Tu reputación fue de ${sessionAttributes['reputacion']} y tu tesoro de ${sessionAttributes['tesoro']}. ` + selectEndPhrase(sessionAttributes);
        resetGame(sessionAttributes);
        return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
    }
};
const SessionEndedRequestHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'SessionEndedRequest';
    },
    handle(handlerInput) {
        // Any cleanup logic goes here.
        return handlerInput.responseBuilder.getResponse();
    }
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
    canHandle() {
        return true;
    },
    handle(handlerInput, error) {
        console.log(`~~~~ Error handled: ${error.message}`);
        const speechText = `Hubo un error. por favor inténtalo otra vez.`;

        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .getResponse();
    }
};

function getModule(id) {
    return modules.game.filter(function(i) { return i.id === id; })[0];
}

function getNextModule(id, choice) {
    const module = getModule(id);
    if(module[choice].targets.length === 0) return null;
    const nextTarget = module[choice].targets[Math.floor(Math.random() * module[choice].targets.length)];
    return getModule(nextTarget);
}

function calculateGameVariables(sessionAttributes, reputacionDif, tesoroDif) {
    sessionAttributes['reputacion'] += reputacionDif;
    sessionAttributes['tesoro'] += tesoroDif;
    console.log(sessionAttributes);
}

function resetGame(sessionAttributes) {
    sessionAttributes['reputacion'] = 50;
    sessionAttributes['tesoro'] = 50;
    sessionAttributes['id'] = 1;
}

function gameOver(sessionAttributes){
    return sessionAttributes['reputacion'] === 100 || 
           sessionAttributes['reputacion'] === 0 || 
           sessionAttributes['tesoro'] === 100 || 
           sessionAttributes['tesoro'] === 0;
}

function responseLoopHandler(handlerInput, choice){
    const {attributesManager} = handlerInput;
    const sessionAttributes = attributesManager.getSessionAttributes();
    let vueltas = sessionAttributes['vueltas'];
    sessionAttributes['vueltas'] = vueltas !== undefined ? vueltas + 1 : 1;
    const moduleId = sessionAttributes['id'];
    const module = getModule(moduleId);
    const nextModule = getNextModule(moduleId, choice);
    if(nextModule) sessionAttributes['id'] = nextModule.id;
    let speechText;
    calculateGameVariables(sessionAttributes, module[choice].variable1, module[choice].variable2);
    if(gameOver(sessionAttributes)) {
        speechText = 'Tu reputación es de ' + sessionAttributes['reputacion'] + ' y tu tesoro de ' + sessionAttributes['tesoro'] + '. ' + selectEndPhrase(sessionAttributes);
        resetGame(sessionAttributes);
        return handlerInput.responseBuilder
        .speak(speechText)
        .getResponse();
    }
    speechText = module[choice].answer;
    module[choice].warning ? speechText += module[choice].warning : speechText;
    if(module.audio){
        speechText += module.audio;
    }
    if(nextModule) {
        speechText += nextModule.question;
        handlerInput.responseBuilder.reprompt(speechText)
    }
    return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
}

function selectEndPhrase(sessionAttributes){
    if(!gameOver(sessionAttributes))
        return 'La vida de marinero es tan dura que ya no lo aguantas. Saltas al mar y desapareces para siempre. Esperamos verte de vuelta. Hasta luego!';
    else {
        switch(sessionAttributes['reputacion']){
            case 0:
                return 'Te has vuelto tan insignificante para la tripulación que elán considera que contigo están desperdiciando las raciones. Te han arrojado por la borda mientras dormías. Vuelve a intentarlo. Hasta luego!';
            case 100:
                return 'Varios marineros se acercaron a tí para complotar un motín y uno era un agente del capitán. Antes que pudieras decir nada ya te han convertido en alimento de tiburones. Vuelve a intentarlo. Hasta luego!';
            default:
                switch(sessionAttributes['tesoro']){
                    case 0:
                        return 'Ya no tienes comida ni nada con que comprarla. Literalmente te has muerto de hambre! Vuelve a intentarlo. Hasta luego!';
                    case 100:
                        return 'Tu camarote luce tantas joyas y trofeos que el capitán lo anexa y te arroja al fondo del mar. Vuelve a intentarlo. Hasta luego!';
                    default:
                        return 'Has muerto por causas desconocidas. Habrá sido natural o hay gato encerrado? Esperamos verte de vuelta. Hasta luego!'
                }
        }
    }
}

function getPersistenceAdapter() {
    const {S3PersistenceAdapter} = require('ask-sdk-s3-persistence-adapter');
        return new S3PersistenceAdapter({
            bucketName: process.env.S3_PERSISTENCE_BUCKET
        });
}

const LoadAttributesRequestInterceptor = {
    async process(handlerInput) {
        const {attributesManager, requestEnvelope} = handlerInput;
        if(requestEnvelope.session['new']){ //is this a new session? this check is not enough if using auto-delegate
            const persistentAttributes = await attributesManager.getPersistentAttributes() || {};
            //copy persistent attribute to session attributes
            attributesManager.setSessionAttributes(persistentAttributes);
        }
    }
};

const SaveAttributesResponseInterceptor = {
    async process(handlerInput, response) {
        if(!response) return; // avoid intercepting calls that have no outgoing response due to errors
        const {attributesManager, requestEnvelope} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        const shouldEndSession = (typeof response.shouldEndSession === "undefined" ? true : response.shouldEndSession); //is this a session end?
        if(shouldEndSession || requestEnvelope.request.type === 'SessionEndedRequest') { // skill was stopped or timed out
            attributesManager.setPersistentAttributes(sessionAttributes);
            await attributesManager.savePersistentAttributes();
        }
    }
};

// This handler acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
    .addRequestHandlers(
        LaunchRequestHandler,
        YesHandler,
        NoHandler,
        HelpIntentHandler,
        CancelAndStopIntentHandler,
        SessionEndedRequestHandler)
    .addRequestInterceptors(
        require('./aplcard').APLHomeCardRequestInterceptor,
        LoadAttributesRequestInterceptor)
    .addResponseInterceptors(SaveAttributesResponseInterceptor)
    .addErrorHandlers(
        ErrorHandler)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();
