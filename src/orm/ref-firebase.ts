import * as admin from 'firebase-admin'
import { firestore } from 'firebase-admin'
import { IDocRef, IQuery } from './orm'

admin.initializeApp()

const db = admin.firestore()

function mapDoc(doc: any) {
  return {
    ...doc.data(),
    id: doc.id,
  }
}

export class FirebaseRef implements IDocRef {
  async get(query: IQuery) {
    if (query.id) {
      const doc = await db.collection(query.collection).doc(query.id).get()

      return mapDoc(doc)
    }

    if (query.where) {
      let col: firestore.Query = db.collection(query.collection)

      for (const key in query.where) {
        col = col.where(key, '==', query.where[key])
      }

      const docsRef = await col.get()

      return docsRef.docs.map(mapDoc)
    }
  }

  async set(query: IQuery) {
    if (!query.id) {
      throw new Error('ID is required')
    }

    return await db.collection(query.collection).doc(query.id).set(query.value)
  }
}
