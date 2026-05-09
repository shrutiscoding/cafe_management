"/**
 * CouchDB driver wrapper (using `nano`).
 */

const nano = require('nano');

let server = null;
let db     = null;

async function init() {
    const url = process.env.COUCH_URL;
    if (!url) throw new Error('COUCH_URL not set');
    server = nano(url);
    const dbName = process.env.COUCH_DB || 'couchdb_reviews';
    // create db if missing
    try { await server.db.create(dbName); } catch (e) {
        if (e.statusCode !== 412) throw e;   // 412 = already exists
    }
    db = server.use(dbName);
    await db.info();
    return db;
}

async function close() {
    server = null;
    db     = null;
}

function isReady() { return db !== null; }

function database() {
    if (!db) throw new Error('CouchDB not initialised');
    return db;
}

module.exports = { init, close, isReady, database };
"

"#!/usr/bin/env bash
# =====================================================================
# Brewgraph :: CouchDB :: 01 Setup
# Creates the couchdb_reviews database and uploads the design doc.
# Requires:  COUCH_URL  (e.g. http://admin:pass@localhost:5984)
# =====================================================================
set -euo pipefail

: \"${COUCH_URL:?Set COUCH_URL, e.g. http://admin:pass@localhost:5984}\"
DB=\"couchdb_reviews\"
HERE=\"$(cd \"$(dirname \"$0\")\" && pwd)\"

echo \">> Creating database $DB (ignore 412 if it already exists)\"
curl -fsS -X PUT \"$COUCH_URL/$DB\" || true

echo \">> Uploading design document _design/reviews\"
curl -fsS -X PUT \"$COUCH_URL/$DB/_design/reviews\" \
     -H \"Content-Type: application/json\" \
     --data-binary \"@$HERE/02_views.json\"

echo \">> Done. Try:\"
echo \"   curl '$COUCH_URL/$DB/_design/reviews/_view/by_item?group=true'\"
"

"{
    \"_id\": \"_design/reviews\",
    \"language\": \"javascript\",
    \"views\": {
        \"by_item\": {
            \"map\":    \"function(doc){ if(doc.type==='review' && doc.item_id){ emit(doc.item_id, 1); } }\",
            \"reduce\": \"_count\"
        },
        \"by_customer\": {
            \"map\":    \"function(doc){ if(doc.type==='review' && doc.customer_id){ emit(doc.customer_id, doc.rating); } }\",
            \"reduce\": \"_count\"
        },
        \"avg_rating\": {
            \"map\":    \"function(doc){ if(doc.type==='review' && doc.item_id && typeof doc.rating==='number'){ emit(doc.item_id, doc.rating); } }\",
            \"reduce\": \"_stats\"
        },
        \"recent\": {
            \"map\":    \"function(doc){ if(doc.type==='review' && doc.created_at){ emit(doc.created_at, {item_id:doc.item_id, rating:doc.rating, comment:doc.comment, customer:doc.customer}); } }\"
        },
        \"low_rated\": {
            \"map\":    \"function(doc){ if(doc.type==='review' && typeof doc.rating==='number' && doc.rating<=2){ emit([doc.item_id, doc.created_at], doc.rating); } }\"
        }
    },
    \"filters\": {
        \"by_branch\": \"function(doc, req){ return doc.type==='review' && doc.branch === req.query.branch; }\"
    }
}
"

"{
    \"docs\": [
        {
            \"_id\": \"review:63e96bbe-d699-4d1a-9f84-02f59bca228d\",
            \"type\": \"review\",
            \"customer_id\": \"CUST-004\",
            \"customer\": \"Chloe Customer\",
            \"item_id\": \"ITM-004\",
            \"item\": \"Cold Brew\",
            \"branch\": \"MUMBAI\",
            \"rating\": 5,
            \"comment\": \"nice\",
            \"created_at\": \"2026-04-19T15:51:22.353Z\"
        },
        {
            \"_id\": \"review:11111111-1111-1111-1111-111111111111\",
            \"type\": \"review\",
            \"customer_id\": \"CUST-001\",
            \"customer\": \"Aarav Sharma\",
            \"item_id\": \"ITM-001\",
            \"item\": \"Cappuccino\",
            \"branch\": \"PUNE\",
            \"rating\": 4,
            \"comment\": \"frothy & warm — perfect for mornings\",
            \"created_at\": \"2026-02-15T08:10:00.000Z\"
        },
        {
            \"_id\": \"review:22222222-2222-2222-2222-222222222222\",
            \"type\": \"review\",
            \"customer_id\": \"CUST-003\",
            \"customer\": \"Rahul Iyer\",
            \"item_id\": \"ITM-003\",
            \"item\": \"Latte\",
            \"branch\": \"PUNE\",
            \"rating\": 5,
            \"comment\": \"silky and balanced\",
            \"created_at\": \"2026-03-06T09:30:00.000Z\"
        },
        {
            \"_id\": \"review:33333333-3333-3333-3333-333333333333\",
            \"type\": \"review\",
            \"customer_id\": \"CUST-002\",
            \"customer\": \"Priya Mehta\",
            \"item_id\": \"ITM-006\",
            \"item\": \"Blueberry Muffin\",
            \"branch\": \"MUMBAI\",
            \"rating\": 2,
            \"comment\": \"too sweet for my taste\",
            \"created_at\": \"2026-02-21T17:05:00.000Z\"
        }
    ]
}
"

"#!/usr/bin/env bash
# =====================================================================
# Brewgraph :: CouchDB :: 20 Application Queries (curl examples)
# =====================================================================
set -euo pipefail
: \"${COUCH_URL:?Set COUCH_URL}\"
DB=\"couchdb_reviews\"

# 1. Bulk-load seed reviews
curl -fsS -X POST \"$COUCH_URL/$DB/_bulk_docs\" \
     -H \"Content-Type: application/json\" \
     --data-binary \"@$(dirname \"$0\")/10_seed.json\"

# 2. Insert one review
curl -fsS -X POST \"$COUCH_URL/$DB\" \
     -H \"Content-Type: application/json\" \
     -d '{\"type\":\"review\",\"customer_id\":\"CUST-002\",\"customer\":\"Priya Mehta\",\"item_id\":\"ITM-003\",\"item\":\"Latte\",\"branch\":\"MUMBAI\",\"rating\":5,\"comment\":\"perfect\",\"created_at\":\"2026-04-25T10:00:00Z\"}'

# 3. Total reviews per item   (group=true uses the reduce _count)
curl -fsS \"$COUCH_URL/$DB/_design/reviews/_view/by_item?group=true\"

# 4. Average rating per item using _stats reduce
curl -fsS \"$COUCH_URL/$DB/_design/reviews/_view/avg_rating?group=true\"

# 5. Reviews for a single item (no reduce)
curl -fsS \"$COUCH_URL/$DB/_design/reviews/_view/by_item?reduce=false&key=%22ITM-001%22&include_docs=true\"

# 6. Latest 20 reviews   (descending by created_at)
curl -fsS \"$COUCH_URL/$DB/_design/reviews/_view/recent?descending=true&limit=20\"

# 7. Low-rated reviews for a specific item
curl -fsS \"$COUCH_URL/$DB/_design/reviews/_view/low_rated?startkey=%5B%22ITM-006%22%5D&endkey=%5B%22ITM-006%22%2C%7B%7D%5D&include_docs=true\"

# 8. Mango query — top reviewers
curl -fsS -X POST \"$COUCH_URL/$DB/_find\" \
     -H \"Content-Type: application/json\" \
     -d '{\"selector\":{\"type\":\"review\",\"rating\":{\"$gte\":4}},\"fields\":[\"customer\",\"item\",\"rating\",\"comment\"],\"sort\":[{\"created_at\":\"desc\"}],\"limit\":10}'

# 9. Filtered changes feed for one branch (live tail)
#    curl \"$COUCH_URL/$DB/_changes?feed=continuous&filter=reviews/by_branch&branch=PUNE\"
"


"# ------------------------------------------------------------
# Brewgraph backend — sample env. Copy to .env and edit.
# ------------------------------------------------------------
PORT=4000

# --- Oracle ---------------------------------------------------
# Either provide a TNS connect string OR host/port/service.
ORACLE_USER=brewgraph
ORACLE_PASSWORD=brewgraph
ORACLE_CONNECT_STRING=localhost:1521/XEPDB1

# --- MongoDB --------------------------------------------------
MONGO_URL=mongodb://localhost:27017
MONGO_DB=brewgraph

# --- Cassandra ------------------------------------------------
CASSANDRA_CONTACT_POINTS=127.0.0.1
CASSANDRA_LOCAL_DC=datacenter1
CASSANDRA_KEYSPACE=brewgraph
# Optional auth
# CASSANDRA_USER=cassandra
# CASSANDRA_PASSWORD=cassandra

# --- Neo4j ----------------------------------------------------
NEO4J_URL=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=neo4j

# --- CouchDB --------------------------------------------------
COUCH_URL=http://admin:password@localhost:5984
COUCH_DB=couchdb_reviews
"