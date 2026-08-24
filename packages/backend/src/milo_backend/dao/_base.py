from milo_backend.core._database import get_database

from pymongo.asynchronous.database import AsyncDatabase

class BaseDAO:
    
    
    collection_name :str
    
    def __init__(self,db:AsyncDatabase)->None:
        self.db = db
        

    @property
    def collection(self):
        return self.db[self.collection_name]
    
    