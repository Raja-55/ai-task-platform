import os
import time
from datetime import datetime, timezone

from dotenv import load_dotenv
from bson import ObjectId
from pymongo import MongoClient
from redis import Redis
from redis.exceptions import ResponseError


def utcnow():
    return datetime.now(timezone.utc)


def apply_operation(operation: str, input_text: str):
    if operation == "uppercase":
        return input_text.upper()
    if operation == "lowercase":
        return input_text.lower()
    if operation == "reverse":
        return input_text[::-1]
    if operation == "word_count":
        words = [w for w in input_text.split() if w.strip()]
        return {"wordCount": len(words)}
    raise ValueError(f"Unsupported operation: {operation}")


def main():
    load_dotenv()
    mongo_uri = os.environ["MONGO_URI"]
    redis_url = os.environ["REDIS_URL"]
    stream_key = os.getenv("REDIS_STREAM_KEY", "ai_tasks")
    group = os.getenv("REDIS_GROUP", "ai_task_workers")
    consumer = os.getenv("WORKER_NAME", f"worker-{os.getpid()}")
    block_ms = int(os.getenv("POLL_BLOCK_MS", "5000"))

    mongo = MongoClient(mongo_uri)
    db = mongo.get_default_database()
    tasks = db["tasks"]

    redis = Redis.from_url(redis_url, decode_responses=True)

    # Create consumer group (idempotent)
    try:
        redis.xgroup_create(name=stream_key, groupname=group, id="0-0", mkstream=True)
    except ResponseError as e:
        if "BUSYGROUP" not in str(e):
            raise

    print(f"[worker] connected. stream={stream_key} group={group} consumer={consumer}", flush=True)

    while True:
        resp = redis.xreadgroup(
            groupname=group,
            consumername=consumer,
            streams={stream_key: ">"},
            count=1,
            block=block_ms,
        )
        if not resp:
            continue

        _, messages = resp[0]
        msg_id, fields = messages[0]
        task_id = fields.get("taskId")

        try:
            if not task_id:
                raise ValueError("Missing taskId in message")
            oid = ObjectId(task_id)
            task = tasks.find_one({"_id": oid})
            if not task:
                raise RuntimeError("Task not found in MongoDB")

            tasks.update_one(
                {"_id": oid},
                {
                    "$set": {"status": "running", "startedAt": utcnow()},
                    "$push": {"logs": {"ts": utcnow(), "level": "info", "message": "Worker started task (running)"}},
                },
            )

            result = apply_operation(task["operation"], task["inputText"])

            tasks.update_one(
                {"_id": oid},
                {
                    "$set": {"status": "success", "result": result, "finishedAt": utcnow()},
                    "$push": {"logs": {"ts": utcnow(), "level": "info", "message": "Task completed (success)"}},
                },
            )
            redis.xack(stream_key, group, msg_id)
        except Exception as e:
            try:
                if task_id:
                    oid = ObjectId(task_id)
                    tasks.update_one(
                        {"_id": oid},
                        {
                            "$set": {"status": "failed", "finishedAt": utcnow()},
                            "$push": {
                                "logs": {
                                    "ts": utcnow(),
                                    "level": "error",
                                    "message": f"Task failed: {str(e)}",
                                }
                            },
                        },
                    )
            except Exception:
                pass

            redis.xack(stream_key, group, msg_id)
            time.sleep(0.1)


if __name__ == "__main__":
    main()
