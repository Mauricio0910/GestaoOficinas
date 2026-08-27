import {
  USE_FIREBASE,
  FIREBASE_TENANT_ID,
  firebaseConfig
} from './firebase-config.js';

const SDK_VERSION = '12.14.0';
const DATA_COLLECTIONS = ['users', 'clientes', 'veiculos', 'servicos', 'pecas', 'ordens', 'logs', 'catalogoVeiculos', 'catalogoPartes', 'catalogoPecas', 'servicosCatalogo'];

let firebaseApp = null;
let firestore = null;
let fb = null;
let saveQueue = Promise.resolve();

function isPlaceholder(value) {
  return !value || String(value).includes('COLE_AQUI') || String(value).includes('SEU_');
}

function hasValidFirebaseConfig() {
  return Boolean(
    USE_FIREBASE &&
    firebaseConfig &&
    !isPlaceholder(firebaseConfig.apiKey) &&
    !isPlaceholder(firebaseConfig.projectId) &&
    !isPlaceholder(firebaseConfig.appId)
  );
}

function clone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function sanitizeForFirestore(value) {
  if (value === undefined) return null;
  if (value === null) return null;
  if (value instanceof Date) return value.toISOString();

  if (Array.isArray(value)) {
    return value.map(sanitizeForFirestore);
  }

  if (typeof value === 'object') {
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      out[key] = sanitizeForFirestore(val);
    }
    return out;
  }

  return value;
}

function sortByDateDesc(arr, field) {
  return arr.sort((a, b) => String(b[field] || '').localeCompare(String(a[field] || '')));
}

async function importFirebaseSdk() {
  const [appSdk, firestoreSdk] = await Promise.all([
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-app.js`),
    import(`https://www.gstatic.com/firebasejs/${SDK_VERSION}/firebase-firestore.js`)
  ]);

  fb = {
    initializeApp: appSdk.initializeApp,
    getFirestore: firestoreSdk.getFirestore,
    doc: firestoreSdk.doc,
    getDoc: firestoreSdk.getDoc,
    setDoc: firestoreSdk.setDoc,
    collection: firestoreSdk.collection,
    getDocs: firestoreSdk.getDocs,
    writeBatch: firestoreSdk.writeBatch
  };
}

async function commitInBatches(operations) {
  const chunkSize = 400;

  for (let i = 0; i < operations.length; i += chunkSize) {
    const batch = fb.writeBatch(firestore);
    for (const op of operations.slice(i, i + chunkSize)) {
      if (op.type === 'set') batch.set(op.ref, op.data);
      if (op.type === 'delete') batch.delete(op.ref);
    }
    await batch.commit();
  }
}

export const firebaseStore = {
  enabled: false,
  permissionError: false,
  tenantId: FIREBASE_TENANT_ID || 'oficina_demo',

  async init() {
    if (!hasValidFirebaseConfig()) {
      this.enabled = false;
      return false;
    }

    if (this.enabled) return true;

    await importFirebaseSdk();
    firebaseApp = fb.initializeApp(firebaseConfig);
    firestore = fb.getFirestore(firebaseApp);
    this.enabled = true;

    return true;
  },

  configDoc() {
    return fb.doc(firestore, 'oficinas', this.tenantId, 'meta', 'config');
  },

  collectionRef(name) {
    return fb.collection(firestore, 'oficinas', this.tenantId, name);
  },

  docRef(name, id) {
    return fb.doc(firestore, 'oficinas', this.tenantId, name, id);
  },

  async loadOrSeed(seedDatabase) {
    if (!this.enabled) return clone(seedDatabase);

    const configSnapshot = await fb.getDoc(this.configDoc());

    if (!configSnapshot.exists()) {
      const seed = clone(seedDatabase);
      seed.session = null;
      await this.saveNow(seed);
      return seed;
    }

    const loaded = {
      config: configSnapshot.data(),
      session: null,
      users: [],
      clientes: [],
      veiculos: [],
      servicos: [],
      pecas: [],
      ordens: [],
      logs: [],
      catalogoVeiculos: [],
      catalogoPartes: [],
      catalogoPecas: [],
      servicosCatalogo: []
    };

    for (const name of DATA_COLLECTIONS) {
      const snapshot = await fb.getDocs(this.collectionRef(name));
      loaded[name] = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    sortByDateDesc(loaded.logs, 'data');
    sortByDateDesc(loaded.ordens, 'dataAbertura');

    return loaded;
  },

  async save(database) {
    if (!this.enabled) return false;
    const snapshot = clone(database);

    saveQueue = saveQueue
      .catch(() => undefined)
      .then(() => this.saveNow(snapshot));

    return saveQueue;
  },

  async saveNow(database) {
    if (!this.enabled) return false;

    await fb.setDoc(this.configDoc(), sanitizeForFirestore(database.config || {}));

    for (const name of DATA_COLLECTIONS) {
      const desired = new Map((database[name] || [])
        .filter(item => item && item.id)
        .map(item => [String(item.id), item]));

      const existingSnapshot = await fb.getDocs(this.collectionRef(name));
      const existingIds = new Set(existingSnapshot.docs.map(doc => doc.id));

      const operations = [];

      for (const [id, item] of desired.entries()) {
        operations.push({
          type: 'set',
          ref: this.docRef(name, id),
          data: sanitizeForFirestore(item)
        });
      }

      for (const id of existingIds) {
        if (!desired.has(id)) {
          operations.push({
            type: 'delete',
            ref: this.docRef(name, id)
          });
        }
      }

      await commitInBatches(operations);
    }

    return true;
  }
};
