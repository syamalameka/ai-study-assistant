import os
import json
import logging
import datetime
from pathlib import Path
from typing import Dict, List, Optional, Any
from app.config import settings

logger = logging.getLogger("ai_study_assistant.database")

DATA_DIR = settings.UPLOAD_DIR.parent / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)
STORE_FILE = DATA_DIR / "db_store.json"

class DatabaseManager:
    def __init__(self):
        self.is_connected = False
        self.client = None
        self.db = None
        self.connection_error = None
        
        # In-memory storage with disk backup
        self._mem_users: Dict[str, Dict[str, Any]] = {}
        self._mem_documents: Dict[str, Dict[str, Any]] = {}
        self._mem_chunks: Dict[str, List[Dict[str, Any]]] = {}
        self._mem_chat: Dict[str, List[Dict[str, Any]]] = {}
        self._mem_study_sets: Dict[str, List[Dict[str, Any]]] = {}
        
        self._load_local_store()
        self.init_connection()

    def _load_local_store(self):
        """Loads persistent local store from disk so data survives server restarts."""
        try:
            if STORE_FILE.exists():
                data = json.loads(STORE_FILE.read_text(encoding="utf-8"))
                self._mem_users = data.get("users", {})
                self._mem_documents = data.get("documents", {})
                self._mem_chunks = data.get("chunks", {})
                self._mem_chat = data.get("chat", {})
                self._mem_study_sets = data.get("study_sets", {})
                logger.info(f"Loaded {len(self._mem_documents)} documents from persistent disk store.")
        except Exception as e:
            logger.warning(f"Could not load local db_store.json: {e}")

    def _save_local_store(self):
        """Persists local state to disk asynchronously/safely."""
        try:
            payload = {
                "users": self._mem_users,
                "documents": self._mem_documents,
                "chunks": self._mem_chunks,
                "chat": self._mem_chat,
                "study_sets": self._mem_study_sets
            }
            STORE_FILE.write_text(json.dumps(payload, indent=2), encoding="utf-8")
        except Exception as e:
            logger.warning(f"Could not write local db_store.json: {e}")

    def init_connection(self):
        """Attempts to connect to MongoDB. If unavailable, uses local store."""
        try:
            from pymongo import MongoClient
            self.client = MongoClient(settings.MONGODB_URI, serverSelectionTimeoutMS=1500)
            self.client.admin.command('ping')
            self.db = self.client[settings.DATABASE_NAME]
            self.is_connected = True
            self.connection_error = None
            logger.info(f"Connected successfully to MongoDB at {settings.MONGODB_URI}")
            
            try:
                self.db.users.create_index([("email", 1)], unique=True)
                self.db.users.create_index([("username", 1)], unique=True)
                self.db.chunks.create_index([("doc_id", 1)])
                self.db.documents.create_index([("doc_id", 1)], unique=True)
                self.db.chat_history.create_index([("session_id", 1)])
            except Exception as e:
                logger.warning(f"Index creation note: {e}")
                
        except Exception as e:
            self.is_connected = False
            self.connection_error = str(e)
            logger.warning(f"MongoDB not reachable ({e}). Operating in persistent Local Store mode.")

    def get_status(self) -> Dict[str, Any]:
        """Returns MongoDB connection status and stats."""
        doc_count = 0
        user_count = 0
        if self.is_connected and self.db is not None:
            try:
                doc_count = self.db.documents.count_documents({})
                user_count = self.db.users.count_documents({})
                return {
                    "connected": True,
                    "engine": "MongoDB",
                    "uri": settings.MONGODB_URI.split("@")[-1] if "@" in settings.MONGODB_URI else settings.MONGODB_URI,
                    "database": settings.DATABASE_NAME,
                    "total_documents": doc_count,
                    "total_users": user_count,
                    "error": None
                }
            except Exception as e:
                self.is_connected = False
                self.connection_error = str(e)
        
        return {
            "connected": False,
            "engine": "Persistent Local Store (Resilience Mode)",
            "uri": settings.MONGODB_URI,
            "database": settings.DATABASE_NAME,
            "total_documents": len(self._mem_documents),
            "total_users": len(self._mem_users),
            "error": self.connection_error or "MongoDB offline. Data permanently saved to local store."
        }

    # --- Users CRUD ---
    def save_user(self, user: Dict[str, Any]) -> bool:
        user_id = user["user_id"]
        if self.is_connected and self.db is not None:
            try:
                self.db.users.update_one(
                    {"user_id": user_id},
                    {"$set": user},
                    upsert=True
                )
            except Exception as e:
                logger.error(f"Error saving user to MongoDB: {e}")
        
        self._mem_users[user_id] = user
        self._save_local_store()
        return True

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        email_clean = email.strip().lower()
        if self.is_connected and self.db is not None:
            try:
                u = self.db.users.find_one({"email": email_clean}, {"_id": 0})
                if u:
                    return u
            except Exception as e:
                logger.error(f"MongoDB get user by email error: {e}")

        for u in self._mem_users.values():
            if u.get("email", "").lower() == email_clean:
                return u
        return None

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        uname_clean = username.strip().lower()
        if self.is_connected and self.db is not None:
            try:
                u = self.db.users.find_one({"username": uname_clean}, {"_id": 0})
                if u:
                    return u
            except Exception as e:
                logger.error(f"MongoDB get user by username error: {e}")

        for u in self._mem_users.values():
            if u.get("username", "").lower() == uname_clean:
                return u
        return None

    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                u = self.db.users.find_one({"user_id": user_id}, {"_id": 0})
                if u:
                    return u
            except Exception as e:
                logger.error(f"MongoDB get user by id error: {e}")
        return self._mem_users.get(user_id)

    # --- Documents CRUD ---
    def save_document(self, doc: Dict[str, Any]) -> bool:
        doc["updated_at"] = datetime.datetime.utcnow().isoformat()
        if self.is_connected and self.db is not None:
            try:
                self.db.documents.update_one(
                    {"doc_id": doc["doc_id"]},
                    {"$set": doc},
                    upsert=True
                )
            except Exception as e:
                logger.error(f"Error saving to MongoDB: {e}")
        
        self._mem_documents[doc["doc_id"]] = doc
        self._save_local_store()
        return True

    def get_document(self, doc_id: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                doc = self.db.documents.find_one({"doc_id": doc_id}, {"_id": 0})
                if doc:
                    return doc
            except Exception as e:
                logger.error(f"MongoDB fetch error: {e}")
        return self._mem_documents.get(doc_id)

    def list_documents(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                query = {}
                if user_id:
                    query = {"$or": [{"user_id": user_id}, {"user_id": "public"}, {"user_id": None}]}
                docs = list(self.db.documents.find(query, {"_id": 0}).sort("uploaded_at", -1))
                return docs
            except Exception as e:
                logger.error(f"MongoDB list error: {e}")
        
        docs = list(self._mem_documents.values())
        if user_id:
            docs = [d for d in docs if d.get("user_id") in (user_id, "public", None)]
        docs.sort(key=lambda x: str(x.get("uploaded_at", "")), reverse=True)
        return docs

    def delete_document(self, doc_id: str) -> bool:
        if self.is_connected and self.db is not None:
            try:
                self.db.documents.delete_one({"doc_id": doc_id})
                self.db.chunks.delete_many({"doc_id": doc_id})
                self.db.study_sets.delete_many({"doc_id": doc_id})
            except Exception as e:
                logger.error(f"MongoDB delete error: {e}")
        
        self._mem_documents.pop(doc_id, None)
        self._mem_chunks.pop(doc_id, None)
        self._mem_study_sets.pop(doc_id, None)
        self._save_local_store()
        return True

    # --- Chunks CRUD ---
    def save_chunks(self, doc_id: str, chunks: List[Dict[str, Any]]) -> bool:
        if self.is_connected and self.db is not None:
            try:
                self.db.chunks.delete_many({"doc_id": doc_id})
                if chunks:
                    self.db.chunks.insert_many(chunks)
            except Exception as e:
                logger.error(f"MongoDB chunks save error: {e}")
        
        self._mem_chunks[doc_id] = chunks
        self._save_local_store()
        return True

    def get_chunks(self, doc_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                chunks = list(self.db.chunks.find({"doc_id": doc_id}, {"_id": 0}).sort("chunk_index", 1))
                return chunks
            except Exception as e:
                logger.error(f"MongoDB chunks fetch error: {e}")
        return self._mem_chunks.get(doc_id, [])

    # --- Chat History CRUD ---
    def save_chat_message(self, session_id: str, doc_id: str, role: str, content: str, citations: Optional[List[Dict]] = None):
        msg = {
            "session_id": session_id,
            "doc_id": doc_id,
            "role": role,
            "content": content,
            "citations": citations or [],
            "timestamp": datetime.datetime.utcnow().isoformat()
        }
        if self.is_connected and self.db is not None:
            try:
                self.db.chat_history.insert_one(msg)
            except Exception as e:
                logger.error(f"MongoDB chat save error: {e}")
        
        if session_id not in self._mem_chat:
            self._mem_chat[session_id] = []
        self._mem_chat[session_id].append(msg)
        self._save_local_store()
        return msg

    def get_chat_history(self, session_id: str) -> List[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                history = list(self.db.chat_history.find({"session_id": session_id}, {"_id": 0}).sort("timestamp", 1))
                return history
            except Exception as e:
                logger.error(f"MongoDB chat fetch error: {e}")
        return self._mem_chat.get(session_id, [])

    def clear_chat_history(self, session_id: str) -> bool:
        if self.is_connected and self.db is not None:
            try:
                self.db.chat_history.delete_many({"session_id": session_id})
            except Exception as e:
                logger.error(f"MongoDB clear chat error: {e}")
        self._mem_chat.pop(session_id, None)
        self._save_local_store()
        return True

    # --- Study Sets ---
    def save_study_set(self, doc_id: str, set_type: str, data: Any) -> Dict[str, Any]:
        record = {
            "doc_id": doc_id,
            "set_type": set_type,
            "data": data,
            "created_at": datetime.datetime.utcnow().isoformat()
        }
        if self.is_connected and self.db is not None:
            try:
                self.db.study_sets.update_one(
                    {"doc_id": doc_id, "set_type": set_type},
                    {"$set": record},
                    upsert=True
                )
            except Exception as e:
                logger.error(f"MongoDB study set save error: {e}")
        
        if doc_id not in self._mem_study_sets:
            self._mem_study_sets[doc_id] = []
        self._mem_study_sets[doc_id] = [s for s in self._mem_study_sets[doc_id] if s.get("set_type") != set_type]
        self._mem_study_sets[doc_id].append(record)
        self._save_local_store()
        return record

    def get_study_set(self, doc_id: str, set_type: str) -> Optional[Dict[str, Any]]:
        if self.is_connected and self.db is not None:
            try:
                res = self.db.study_sets.find_one({"doc_id": doc_id, "set_type": set_type}, {"_id": 0})
                if res:
                    return res
            except Exception as e:
                logger.error(f"MongoDB study set fetch error: {e}")
        sets = self._mem_study_sets.get(doc_id, [])
        for s in sets:
            if s.get("set_type") == set_type:
                return s
        return None

db_manager = DatabaseManager()
