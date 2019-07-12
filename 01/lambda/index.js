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
        speechText += module.question;
        
        return handlerInput.responseBuilder
            .speak(speechText)
            .reprompt(speechText)
            .withStandardCard('Sí mi Capitán', module.question, module.image) // <--
            .getResponse();
    }
};

const YesHandler = {
    canHandle(handlerInput){
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.YesIntent';
    },
    handle(handlerInput){
        const {attributesManager} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        let vueltas = sessionAttributes['vueltas'];
        sessionAttributes['vueltas'] = vueltas !== undefined ? vueltas + 1 : 1;
        const moduleId = sessionAttributes['id'];
        const module = getModule(moduleId);
        const nextModule = getNextModule(moduleId);
        if(nextModule) sessionAttributes['id'] = nextModule.id;
        let speechText;
        calculateGameVariables(sessionAttributes, module.yes.variable1, module.yes.variable2);
        if(sessionAttributes['reputacion'] === 100 || sessionAttributes['reputacion'] === 0 || sessionAttributes['tesoro'] === 100 || sessionAttributes['tesoro'] === 0) {
            speechText = 'Tu reputación es de ' + sessionAttributes['reputacion'] + ' y tu tesoro de ' + sessionAttributes['tesoro'] + '. Lamentablemente no has sobrevivido al viaje! Inténtalo otra vez! Hasta la próxima!';
            return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
        }
        speechText = module.yes.answer;
        module.yes.warning ? speechText += module.yes.warning : speechText;
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
}

const NoHandler = {
    canHandle(handlerInput){
        return handlerInput.requestEnvelope.request.type === 'IntentRequest'
            && handlerInput.requestEnvelope.request.intent.name === 'AMAZON.NoIntent';
    },
    handle(handlerInput){
        const {attributesManager} = handlerInput;
        const sessionAttributes = attributesManager.getSessionAttributes();
        let vueltas = sessionAttributes['vueltas'];
        sessionAttributes['vueltas'] = vueltas ? vueltas + 1 : 0;
        const moduleId = sessionAttributes['id'];
        const module = getModule(moduleId);
        const nextModule = getNextModule(moduleId);
        if(nextModule) sessionAttributes['id'] = nextModule.id;
        let speechText;
        calculateGameVariables(sessionAttributes, module.no.variable1, module.no.variable2);
        if(sessionAttributes['reputacion'] === 100 || sessionAttributes['reputacion'] === 0 || sessionAttributes['tesoro'] === 100 || sessionAttributes['tesoro'] === 0) {
            speechText = 'Tu reputación es de ' + sessionAttributes['reputacion'] + ' y tu tesoro de ' + sessionAttributes['tesoro'] + '. Lamentablemente no has sobrevivido al viaje! Inténtalo otra vez! Hasta la próxima!';
            return handlerInput.responseBuilder
            .speak(speechText)
            .getResponse();
        }
        speechText = module.no.answer;
        module.no.warning ? speechText += module.no.warning : speechText;
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
        
        const speechText = `Has durado ${sessionAttributes['vueltas']} turnos. Tu reputación fue de ${sessionAttributes['reputacion']} y tu tesoro de ${sessionAttributes['tesoro']}. Al salir te has caído por la borda así que tendrás que volver a empezar! Hasta la próxima!`;

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

// The intent reflector is used for interaction model testing and debugging.
// It will simply repeat the intent the user said. You can create custom handlers
// for your intents by defining them above, then also adding them to the request
// handler chain below.
const IntentReflectorHandler = {
    canHandle(handlerInput) {
        return handlerInput.requestEnvelope.request.type === 'IntentRequest';
    },
    handle(handlerInput) {
        const intentName = handlerInput.requestEnvelope.request.intent.name;
        const speechText = `You just triggered ${intentName}`;

        return handlerInput.responseBuilder
            .speak(speechText)
            //.reprompt('add a reprompt if you want to keep the session open for the user to respond')
            .getResponse();
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

function getNextModule(id) {
    const module = getModule(id);
    if(module.targets.length === 0) return null;
    const nextTarget = module.targets[Math.floor(Math.random() * module.targets.length)];
    return getModule(nextTarget);
}

function calculateGameVariables(sessionAttributes, reputacionDif, tesoroDif) {
    sessionAttributes['reputacion'] += reputacionDif;
    sessionAttributes['tesoro'] += tesoroDif;
    console.log(sessionAttributes);
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
        SessionEndedRequestHandler,
        IntentReflectorHandler) // make sure IntentReflectorHandler is last so it doesn't override your custom intent handlers
    .addRequestInterceptors(
        require('./aplcard').APLHomeCardRequestInterceptor,
        LoadAttributesRequestInterceptor)
    .addResponseInterceptors(SaveAttributesResponseInterceptor)
    .addErrorHandlers(
        ErrorHandler)
    .withPersistenceAdapter(persistenceAdapter)
    .lambda();
