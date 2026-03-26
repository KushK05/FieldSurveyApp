import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

interface SurveyAppDB extends DBSchema {
  pendingSurveys: {
    key: string;
    value: {
      id: string;
      surveyId: string;
      data: any;
      timestamp: number;
    };
  };
  surveyForms: {
    key: string;
    value: {
      id: string;
      title: string;
      schema: any;
      updatedAt: number;
    };
  };
}

let dbPromise: Promise<IDBPDatabase<SurveyAppDB>> | null = null;

export const initDB = () => {
  if (!dbPromise) {
    dbPromise = openDB<SurveyAppDB>('survey-app-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('pendingSurveys')) {
          db.createObjectStore('pendingSurveys', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('surveyForms')) {
          db.createObjectStore('surveyForms', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
};

export const savePendingSurvey = async (survey: { id: string; surveyId: string; data: any; timestamp: number }) => {
  const db = await initDB();
  await db.put('pendingSurveys', survey);
};

export const getPendingSurveys = async () => {
  const db = await initDB();
  return db.getAll('pendingSurveys');
};

export const removePendingSurvey = async (id: string) => {
  const db = await initDB();
  await db.delete('pendingSurveys', id);
};

export const saveSurveyForms = async (forms: any[]) => {
  const db = await initDB();
  const tx = db.transaction('surveyForms', 'readwrite');
  await Promise.all(forms.map(f => tx.store.put(f)));
  await tx.done;
};

export const getOfflineSurveyForms = async () => {
  const db = await initDB();
  return db.getAll('surveyForms');
};
