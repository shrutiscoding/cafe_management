"/**
 * Cassandra driver wrapper.
 */

const cassandra = require('cassandra-driver');

let client = null;

async function init() {
    if (client) return client;
    const contactPoints = (process.env.CASSANDRA_CONTACT_POINTS || '').split(',').map(s => s.trim()).filter(Boolean);
    if (!contactPoints.length) throw new Error('CASSANDRA_CONTACT_POINTS not set');

    const cfg = {
        contactPoints,
        localDataCenter: process.env.CASSANDRA_LOCAL_DC || 'datacenter1',
        keyspace:        process.env.CASSANDRA_KEYSPACE || 'brewgraph'
    };
    if (process.env.CASSANDRA_USER) {
        cfg.authProvider = new cassandra.auth.PlainTextAuthProvider(
            process.env.CASSANDRA_USER, process.env.CASSANDRA_PASSWORD || ''
        );
    }
    client = new cassandra.Client(cfg);
    await client.connect();
    return client;
}

async function close() {
    if (client) { await client.shutdown(); client = null; }
}

function isReady() { return client !== null; }

async function execute(cql, params = [], opts = { prepare: true }) {
    if (!client) throw new Error('Cassandra not initialised');
    return client.execute(cql, params, opts);
}

module.exports = { init, close, isReady, execute };
"


CREATE KEYSPACE IF NOT EXISTS brewgraph
WITH replication = {
    'class': 'SimpleStrategy',
    'replication_factor': 1
}
AND durable_writes = true;

USE brewgraph;

USE brewgraph;

DROP TABLE IF EXISTS cassandra_order_logs;


CREATE TABLE cassandra_order_logs (
    branch       text,
    order_id     text,
    event_ts     timestamp,
    event_type   text,            -- NEW | PREPARING | READY | DELIVERED | CANCELLED | PAID
    customer_id  text,
    actor        text,            -- employee or system actor
    amount       decimal,
    item_count   int,
    metadata     map<text, text>,
    PRIMARY KEY ((branch), order_id, event_ts)
)
WITH CLUSTERING ORDER BY (order_id ASC, event_ts DESC)
 AND comment = 'Append-only order event log, queried per branch'
 AND default_time_to_live = 7776000;     -- 90 days TTL

-- Aggregated per-branch hourly counter (for live dashboards)
DROP TABLE IF EXISTS cassandra_branch_hourly_stats;

CREATE TABLE cassandra_branch_hourly_stats (
    branch     text,
    bucket_hr  timestamp,
    orders     counter,
    revenue    counter,        -- in paise (so we can use counter)
    PRIMARY KEY ((branch), bucket_hr)
) WITH CLUSTERING ORDER BY (bucket_hr DESC);



USE brewgraph;

INSERT INTO cassandra_order_logs (branch, order_id, event_ts, event_type, customer_id, actor, amount, item_count, metadata)
VALUES ('PUNE', 'ORD-P-1001', '2026-02-14 10:00:00', 'NEW',       'CUST-001', 'pos-1', 320, 3, {'channel':'in-store'});

INSERT INTO cassandra_order_logs (branch, order_id, event_ts, event_type, customer_id, actor, amount, item_count, metadata)
VALUES ('PUNE', 'ORD-P-1001', '2026-02-14 10:02:00', 'PREPARING', 'CUST-001', 'EMP-PUN-001', null, null, {});

INSERT INTO cassandra_order_logs (branch, order_id, event_ts, event_type, customer_id, actor, amount, item_count, metadata)
VALUES ('PUNE', 'ORD-P-1001', '2026-02-14 10:08:00', 'DELIVERED', 'CUST-001', 'EMP-PUN-001', null, null, {});

INSERT INTO cassandra_order_logs (branch, order_id, event_ts, event_type, customer_id, actor, amount, item_count, metadata)
VALUES ('PUNE', 'ORD-P-1002', '2026-03-05 09:15:00', 'NEW',       'CUST-003', 'pos-1', 230, 2, {'channel':'app'});

INSERT INTO cassandra_order_logs (branch, order_id, event_ts, event_type, customer_id, actor, amount, item_count, metadata)
VALUES ('MUMBAI','ORD-M-2001', '2026-02-20 11:30:00','NEW',       'CUST-002', 'pos-2', 410, 3, {'channel':'in-store'});

INSERT INTO cassandra_order_logs (branch, order_id, event_ts, event_type, customer_id, actor, amount, item_count, metadata)
VALUES ('MUMBAI','ORD-M-2002', '2026-04-02 14:00:00','NEW',       'CUST-004', 'pos-2', 290, 2, {'channel':'app'});

-- counter writes
UPDATE cassandra_branch_hourly_stats
   SET orders  = orders  + 1,
       revenue = revenue + 32000
 WHERE branch = 'PUNE'   AND bucket_hr = '2026-02-14 10:00:00';

UPDATE cassandra_branch_hourly_stats
   SET orders  = orders  + 1,
       revenue = revenue + 41000
 WHERE branch = 'MUMBAI' AND bucket_hr = '2026-02-20 11:00:00';

 "-- =====================================================================
-- Brewgraph :: Cassandra :: 20 Application Queries
-- Cassandra query rule: always include the partition key.
-- =====================================================================

USE brewgraph;

-- 1. Full event timeline of one order in a branch
SELECT event_ts, event_type, actor, amount, metadata
  FROM cassandra_order_logs
 WHERE branch = 'PUNE' AND order_id = 'ORD-P-1001';

-- 2. Latest 100 events for a branch
SELECT order_id, event_ts, event_type, customer_id, amount
  FROM cassandra_order_logs
 WHERE branch = 'PUNE'
 LIMIT 100;

-- 3. Orders for a branch on a specific day
SELECT order_id, event_ts, event_type, amount
  FROM cassandra_order_logs
 WHERE branch = 'MUMBAI'
   AND order_id IN ('ORD-M-2001','ORD-M-2002')
   AND event_ts >= '2026-02-20 00:00:00'
   AND event_ts <  '2026-02-21 00:00:00';

-- 4. Hourly dashboard snapshot for a branch
SELECT bucket_hr, orders, revenue
  FROM cassandra_branch_hourly_stats
 WHERE branch = 'PUNE'
 LIMIT 24;

-- 5. Append a new event (typical write path)
INSERT INTO cassandra_order_logs
    (branch, order_id, event_ts, event_type, customer_id, actor, amount, item_count, metadata)
VALUES
    (?,      ?,        toTimestamp(now()), ?,        ?,          ?,    ?,       ?,         ?);

-- 6. Update counter on dashboard
UPDATE cassandra_branch_hourly_stats
   SET orders = orders + 1, revenue = revenue + ?
 WHERE branch = ? AND bucket_hr = ?;
"

