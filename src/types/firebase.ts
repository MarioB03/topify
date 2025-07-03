import { 
  Firestore,
  CollectionReference,
  DocumentData,
  Query,
  QueryDocumentSnapshot,
  DocumentReference,
  WhereFilterOp,
  OrderByDirection
} from 'firebase/firestore';

export interface FirestoreUtils {
  collection: (firestore: Firestore, path: string) => CollectionReference<DocumentData>;
  addDoc: (reference: CollectionReference<DocumentData>, data: DocumentData) => Promise<DocumentReference<DocumentData>>;
  getDocs: (query: Query<DocumentData>) => Promise<{
    empty: boolean;
    docs: QueryDocumentSnapshot<DocumentData>[];
  }>;
  updateDoc: (reference: DocumentReference<DocumentData>, data: DocumentData) => Promise<void>;
  doc: (firestore: Firestore, path: string, ...pathSegments: string[]) => DocumentReference<DocumentData>;
  deleteDoc: (reference: DocumentReference<DocumentData>) => Promise<void>;
  query: (
    reference: CollectionReference<DocumentData>,
    ...queryConstraints: QueryConstraint[]
  ) => Query<DocumentData>;
  orderBy: (fieldPath: string, directionStr?: OrderByDirection) => QueryConstraint;
  where: (fieldPath: string, opStr: WhereFilterOp, value: unknown) => QueryConstraint;
}

export interface QueryConstraint {
  type: string;
}