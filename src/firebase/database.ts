import { firestore as db } from './firebase'

export async function getDocs(collection: FirebaseFirestore.Query) {
  return (await collection.get()).docs.map(
    (doc) =>
      ({
        ...doc.data(),
        id: doc.id,
      } as any)
  )
}

export async function getDocuments(collectionName: string) {
  return await getDocs(
    db.collection(collectionName).orderBy('createdAt', 'desc')
  )
}
