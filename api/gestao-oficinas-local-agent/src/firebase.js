const fs = require('fs');
const admin = require('firebase-admin');
const { config } = require('./config');

function getFirestore(){
  if(!fs.existsSync(config.firebase.serviceAccountPath)){
    throw new Error('Service account não encontrado: ' + config.firebase.serviceAccountPath);
  }
  if(!admin.apps.length){
    const serviceAccount = require(config.firebase.serviceAccountPath);
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
  }
  return admin.firestore();
}
module.exports = { getFirestore };
