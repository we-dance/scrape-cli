import * as admin from 'firebase-admin'
import { IDocRef, IQuery } from './orm'

admin.initializeApp()

const firestore = admin.firestore()

function mapDoc(doc: any) {
  return {
    ...doc.data(),
    id: doc.id,
  }
}

export class FirebaseRef implements IDocRef {
  async get(query: IQuery) {
    const doc = await firestore.collection(query.collection).doc(query.id).get()

    return mapDoc(doc)
  }

  async set(query: IQuery) {
    return await firestore
      .collection(query.collection)
      .doc(query.id)
      .set(query.value)
  }
}
